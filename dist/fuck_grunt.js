(function() {
  var UglifyJS, async, base_url, basename, cheerio, crypto, cssmin, dir_url, fetch_file, fs, full_url, gather_css, gather_js, hash_data, parsed_url, protocol, request, url;

  fs = require('fs');

  crypto = require('crypto');

  async = require('async');

  request = require('request');

  cheerio = require('cheerio');

  cssmin = require('cssmin');

  UglifyJS = require('uglify-js2');

  url = process.argv[process.argv.length - 1];

  parsed_url = require('url').parse(url);

  protocol = parsed_url.protocol;

  base_url = protocol + '//' + parsed_url.hostname;

  dir_url = base_url + require('path').dirname(parsed_url.pathname);

  basename = require('path').basename(parsed_url.pathname);

  if (basename === '') {
    basename = parsed_url.host;
  }

  fetch_file = function(url, callback) {
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

  full_url = function(url) {
    if (/^\/\//.test(url)) {
      url = protocol + url;
    }
    if (/^\/[^\/]/.test(url)) {
      url = base_url + url;
    }
    if (!/^https?:\/\//.test(url)) {
      url = dir_url + '/' + url;
    }
    return url;
  };

  hash_data = function(data) {
    var hash;
    hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
  };

  gather_js = function($, callback) {
    var scripts;
    scripts = $('script[src]:not([data-no-fuck])').toArray();
    if (scripts.length === 0) {
      return callback();
    }
    return async.map(scripts, function(script, cb) {
      var src;
      src = full_url($(script).attr('src'));
      return fetch_file(src, cb);
    }, function(err, data) {
      var content, filename;
      if (err != null) {
        return callback(err);
      }
      content = UglifyJS.minify(data.join('\n'), {
        fromString: true
      }).code;
      filename = basename + '.' + hash_data(content) + '.min.js';
      $(scripts[0]).before('<script type="text/javascript" src="/javascripts/' + filename + '"></script>');
      $(scripts).remove();
      return callback(null, {
        filename: filename,
        data: content,
        count: scripts.length
      });
    });
  };

  gather_css = function($, callback) {
    var links;
    links = $('link[href][rel="stylesheet"]:not([data-no-fuck])').toArray();
    if (links.length === 0) {
      return callback();
    }
    return async.map(links, function(link, cb) {
      var href;
      href = full_url($(link).attr('href'));
      return fetch_file(href, cb);
    }, function(err, data) {
      var content, filename;
      if (err != null) {
        return callback(err);
      }
      content = cssmin(data.join('\n'));
      filename = basename + '.' + hash_data(content) + '.min.css';
      $(links[0]).before('<link rel="stylesheet" type="text/css" href="/stylesheets/' + filename + '">');
      $(links).remove();
      return callback(null, {
        filename: filename,
        data: content,
        count: links.length
      });
    });
  };

  fetch_file(url, function(err, html) {
    var $;
    if (err != null) {
      return console.log(err.stack);
    }
    $ = cheerio.load(html);
    return async.parallel({
      js: function(cb) {
        return gather_js($, cb);
      },
      css: function(cb) {
        return gather_css($, cb);
      }
    }, function(err, data) {
      if (err != null) {
        return console.log(err.stack);
      }
      fs.writeFileSync(basename + '.html', $.html(), 'utf8');
      console.log('Wrote ' + basename + '.html');
      if (data.js != null) {
        fs.writeFileSync(data.js.filename, data.js.data, 'utf8');
        console.log('Compiled ' + data.js.count + ' file(s) into ' + data.js.filename);
      }
      if (data.css != null) {
        fs.writeFileSync(data.css.filename, data.css.data, 'utf8');
        return console.log('Compiled ' + data.css.count + ' file(s) into ' + data.css.filename);
      }
    });
  });

}).call(this);
