# fuck_grunt
Concat and minify the javascript and CSS on any webpage. Just point fuck_grunt at the page and it'll give you
back the html, js, and css files.

This is definitely a hack, but useful if you already have a running site and just want to combine and minify your files
without spending a lot of time getting a whole grunt setup going. Yes you'll have to do it again if you change any code,
but that's why this is called a hack. =-)

## Installation
```bash
$ npm install -g fuck_grunt
```

## Usage
```bash
$ fuck_grunt http://www.dailypuppy.com/
```

### Don't fuck some of my javascript/CSS files

To exclude some scripts or link tags, just add the `data-no-fuck` property to the tag

```html
<script src="/foo/bar.js" data-no-fuck></script>
<link href="/foo/bar.css" rel="stylesheet" data-no-fuck>
```

## Programmatic Usage
```javascript
var fuck_grunt = require('fuck_grunt');

// Just process files
fuck_grunt('http://www.dailypuppy.com', handle_result);

// Process files and write to current directory
fuck_grunt('http://www.dailypuppy.com', {write_files: true}, handle_result);
```

### Result Data
```javascript
{
  "html": {
    "filename": "..."    // filename of output file or null
    "content": "...",    // processed file content
    "files": [...]       // list of files included in content
  },
  "js": {
    "filename": "...",
    "content": "...",
    "files": [...]
  },
  "css": {
    "filename": "...",
    "content": "...",
    "files": [...]
  },
}
```
