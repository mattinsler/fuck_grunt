fs = require 'fs'
crypto = require 'crypto'

async = require 'async'
request = require 'request'
cheerio = require 'cheerio'
cssmin = require 'cssmin'
UglifyJS = require 'uglify-js2'

url = process.argv[process.argv.length - 1]
parsed_url = require('url').parse(url)
protocol = parsed_url.protocol
base_url = protocol + '//' + parsed_url.hostname
dir_url = base_url + require('path').dirname(parsed_url.pathname)
basename = require('path').basename(parsed_url.pathname)
basename = parsed_url.host if basename is ''

fetch_file = (url, callback) ->
  request url, (err, res, body) ->
    return callback(err) if err?
    return callback(new Error(body)) if parseInt(res.statusCode / 100) isnt 2
    callback(null, body)

full_url = (url) ->
  url = protocol + url if /^\/\//.test(url)
  url = base_url + url if /^\/[^\/]/.test(url)
  url = dir_url + '/' + url unless /^https?:\/\//.test(url)
  url

hash_data = (data) ->
  hash = crypto.createHash('md5')
  hash.update(data)
  hash.digest('hex')

gather_js = ($, callback) ->
  scripts = $('script[src]:not([data-no-fuck])').toArray()
  return callback() if scripts.length is 0
  
  async.map scripts, (script, cb) ->
    src = full_url($(script).attr('src'))
    # console.log 'SCRIPT: ' + src
    fetch_file(src, cb)
  , (err, data) ->
    return callback(err) if err?
    
    content = UglifyJS.minify(data.join('\n'), fromString: true).code
    filename = basename + '.' + hash_data(content) + '.min.js'
    $(scripts[0]).before('<script type="text/javascript" src="/javascripts/' + filename + '"></script>')
    $(scripts).remove()
    
    callback(null, filename: filename, data: content, count: scripts.length)

gather_css = ($, callback) ->
  links = $('link[href][rel="stylesheet"]:not([data-no-fuck])').toArray()
  return callback() if links.length is 0
  
  async.map links, (link, cb) ->
    href = full_url($(link).attr('href'))
    # console.log 'CSS: ' + href
    fetch_file(href, cb)
  , (err, data) ->
    return callback(err) if err?
    
    content = cssmin(data.join('\n'))
    filename = basename + '.' + hash_data(content) + '.min.css'
    $(links[0]).before('<link rel="stylesheet" type="text/css" href="/stylesheets/' + filename + '">')
    $(links).remove()
    
    callback(null, filename: filename, data: content, count: links.length)

fetch_file url, (err, html) ->
  return console.log(err.stack) if err?
  
  $ = cheerio.load(html)
  async.parallel {
    js: (cb) -> gather_js($, cb)
    css: (cb) -> gather_css($, cb)
  }, (err, data) ->
    return console.log(err.stack) if err?
    
    fs.writeFileSync(basename + '.html', $.html(), 'utf8')
    console.log 'Wrote ' + basename + '.html'
    
    if data.js?
      fs.writeFileSync(data.js.filename, data.js.data, 'utf8')
      console.log 'Compiled ' + data.js.count + ' file(s) into ' + data.js.filename

    if data.css?
      fs.writeFileSync(data.css.filename, data.css.data, 'utf8')
      console.log 'Compiled ' + data.css.count + ' file(s) into ' + data.css.filename
