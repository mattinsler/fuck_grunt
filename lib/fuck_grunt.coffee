fs = require 'fs'
crypto = require 'crypto'

async = require 'async'
request = require 'request'
cheerio = require 'cheerio'
cssmin = require 'cssmin'
UglifyJS = require 'uglify-js2'

class Fucker
  constructor: (@url) ->
    path = require 'path'
    @parsed_url = require('url').parse(@url)
    @protocol = @parsed_url.protocol
    @base_url = @protocol + '//' + @parsed_url.hostname
    @dir_url = @base_url + path.dirname(@parsed_url.pathname)
    @basename = path.basename(@parsed_url.pathname)
    @basename = @parsed_url.host if @basename is ''
  
  fetch_file: (url, callback) ->
    request url, (err, res, body) ->
      return callback(err) if err?
      return callback(new Error(body)) if parseInt(res.statusCode / 100) isnt 2
      callback(null, body)

  full_url: (url) ->
    url = @protocol + url if /^\/\//.test(url)
    url = @base_url + url if /^\/[^\/]/.test(url)
    url = @dir_url + '/' + url unless /^https?:\/\//.test(url)
    url

  hash_data: (data) ->
    hash = crypto.createHash('md5')
    hash.update(data)
    hash.digest('hex')

  gather_js: ($, callback) ->
    scripts = $('script[src]:not([data-no-fuck])').toArray()
    return callback(null, filename: null, content: '', files: []) if scripts.length is 0
    
    script_srcs = scripts.map (script) => @full_url($(script).attr('src'))
    
    async.map script_srcs, @fetch_file, (err, data) =>
      return callback(err) if err?

      content = UglifyJS.minify(data.join('\n'), fromString: true).code
      filename = @basename + '.' + @hash_data(content) + '.min.js'
      $(scripts[0]).before('<script type="text/javascript" src="/javascripts/' + filename + '"></script>')
      $(scripts).remove()

      callback(null, filename: filename, content: content, files: script_srcs)

  gather_css: ($, callback) ->
    links = $('link[href][rel="stylesheet"]:not([data-no-fuck])').toArray()
    return callback(null, filename: null, content: '', files: []) if links.length is 0
    
    link_hrefs = links.map (link) => @full_url($(link).attr('href'))
    
    async.map link_hrefs, @fetch_file, (err, data) =>
      return callback(err) if err?

      content = cssmin(data.join('\n'))
      filename = @basename + '.' + @hash_data(content) + '.min.css'
      $(links[0]).before('<link rel="stylesheet" type="text/css" href="/stylesheets/' + filename + '">')
      $(links).remove()

      callback(null, filename: filename, content: content, files: link_hrefs)
  
  fuck: (opts, callback) ->
    @fetch_file @url, (err, html) =>
      return callback(err) if err?

      $ = cheerio.load(html)
      async.parallel {
        js: (cb) => @gather_js($, cb)
        css: (cb) => @gather_css($, cb)
      }, (err, data) =>
        return callback?(err) if err?
        
        data.html =
          filename: @basename + '.html'
          content: $.html()
          files: [@url]
        
        if opts.write_files is true
          fs.writeFileSync(data.html.filename, data.html.content, 'utf8') if data.html.filename?
          fs.writeFileSync(data.js.filename,   data.js.content,   'utf8') if data.js.filename?
          fs.writeFileSync(data.css.filename,  data.css.content,  'utf8') if data.css.filename?
        
        callback?(null, data)

module.exports = (url, opts, callback) ->
  if typeof opts is 'function'
    callback = opts
    opts = {}
  opts ?= {}
  
  return callback(new Error('Invalid URL ' + url)) unless /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/.test(url)
  
  new Fucker(url).fuck(opts, callback)
