(function() {
  var Fucker, UglifyJS, async, cheerio, crypto, cssmin, fs, request;

  fs = require('fs');

  crypto = require('crypto');

  async = require('async');

  request = require('request');

  cheerio = require('cheerio');

  cssmin = require('cssmin');

  UglifyJS = require('uglify-js2');

  Fucker = (function() {

    function Fucker(url) {
      var path;
      this.url = url;
      path = require('path');
      this.parsed_url = require('url').parse(this.url);
      this.protocol = this.parsed_url.protocol;
      this.base_url = this.protocol + '//' + this.parsed_url.hostname;
      this.dir_url = this.base_url + path.dirname(this.parsed_url.pathname);
      this.basename = path.basename(this.parsed_url.pathname);
      if (this.basename === '') {
        this.basename = this.parsed_url.host;
      }
    }

    Fucker.prototype.fetch_file = function(url, callback) {
      return request(url, function(err, res, body) {
        if (err != null) {
          return callback(err);
        }
        if (parseInt(res.statusCode / 100) !== 2) {
          return callback(new Error(body));
        }
        return callback(null, body);
      });
    };

    Fucker.prototype.full_url = function(url) {
      if (/^\/\//.test(url)) {
        url = this.protocol + url;
      }
      if (/^\/[^\/]/.test(url)) {
        url = this.base_url + url;
      }
      if (!/^https?:\/\//.test(url)) {
        url = this.dir_url + '/' + url;
      }
      return url;
    };

    Fucker.prototype.hash_data = function(data) {
      var hash;
      hash = crypto.createHash('md5');
      hash.update(data);
      return hash.digest('hex');
    };

    Fucker.prototype.gather_js = function($, callback) {
      var script_srcs, scripts,
        _this = this;
      scripts = $('script[src]:not([data-no-fuck])').toArray();
      if (scripts.length === 0) {
        return callback(null, {
          filename: null,
          content: '',
          files: []
        });
      }
      script_srcs = scripts.map(function(script) {
        return _this.full_url($(script).attr('src'));
      });
      return async.map(script_srcs, this.fetch_file, function(err, data) {
        var content, filename;
        if (err != null) {
          return callback(err);
        }
        content = UglifyJS.minify(data.join('\n'), {
          fromString: true
        }).code;
        filename = _this.basename + '.' + _this.hash_data(content) + '.min.js';
        $(scripts[0]).before('<script type="text/javascript" src="/javascripts/' + filename + '"></script>');
        $(scripts).remove();
        return callback(null, {
          filename: filename,
          content: content,
          files: script_srcs
        });
      });
    };

    Fucker.prototype.gather_css = function($, callback) {
      var link_hrefs, links,
        _this = this;
      links = $('link[href][rel="stylesheet"]:not([data-no-fuck])').toArray();
      if (links.length === 0) {
        return callback(null, {
          filename: null,
          content: '',
          files: []
        });
      }
      link_hrefs = links.map(function(link) {
        return _this.full_url($(link).attr('href'));
      });
      return async.map(link_hrefs, this.fetch_file, function(err, data) {
        var content, filename;
        if (err != null) {
          return callback(err);
        }
        content = cssmin(data.join('\n'));
        filename = _this.basename + '.' + _this.hash_data(content) + '.min.css';
        $(links[0]).before('<link rel="stylesheet" type="text/css" href="/stylesheets/' + filename + '">');
        $(links).remove();
        return callback(null, {
          filename: filename,
          content: content,
          files: link_hrefs
        });
      });
    };

    Fucker.prototype.fuck = function(opts, callback) {
      var _this = this;
      return this.fetch_file(this.url, function(err, html) {
        var $;
        if (err != null) {
          return callback(err);
        }
        $ = cheerio.load(html);
        return async.parallel({
          js: function(cb) {
            return _this.gather_js($, cb);
          },
          css: function(cb) {
            return _this.gather_css($, cb);
          }
        }, function(err, data) {
          if (err != null) {
            return typeof callback === "function" ? callback(err) : void 0;
          }
          data.html = {
            filename: _this.basename + '.html',
            content: $.html(),
            files: [_this.url]
          };
          if (opts.write_files === true) {
            if (data.html.filename != null) {
              fs.writeFileSync(data.html.filename, data.html.content, 'utf8');
            }
            if (data.js.filename != null) {
              fs.writeFileSync(data.js.filename, data.js.content, 'utf8');
            }
            if (data.css.filename != null) {
              fs.writeFileSync(data.css.filename, data.css.content, 'utf8');
            }
          }
          return typeof callback === "function" ? callback(null, data) : void 0;
        });
      });
    };

    return Fucker;

  })();

  module.exports = function(url, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = {};
    }
    if (opts == null) {
      opts = {};
    }
    if (!/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/.test(url)) {
      return callback(new Error('Invalid URL ' + url));
    }
    return new Fucker(url).fuck(opts, callback);
  };

}).call(this);
