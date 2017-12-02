# elevenisland

Transform a directory of templates into HTML.

Works with:

* HTML (`html`)
* [Liquid (`liquid`)](https://www.npmjs.com/package/liquidjs) (used by Jekyll, defaulted on for HTML and Markdown files unless otherwise specified)
* EJS (`ejs`)
* Mustache (`mustache`)
* Handlebars (`hbs`)
* Markdown (`md`)
* Haml (`haml`)
* Pug (formerly Jade, `pug`)
* Nunjucks (`njk`)

## Usage

```
elevenisland

# Watch
elevenisland --watch

# Change directories
elevenisland --input=./templates --output=./dist

# Control which template types get translated
elevenisland --formats=md,html,ejs

# Use help to find out the latest commands
elevenisland --help
```

### Examples

```
# Watch a directory for any changes to markdown files, then
# automatically parse and output as HTML files, respecting
# directory structure.

elevenisland --input=. --output=. --watch --formats=md
```

#### Don’t overwrite your HTML templates

```
# Template types output to HTML. So when you take an HTML file
# as input and attempt to write it to the same directory, we
# add a "-output" suffix to the file name so that you don’t
# lose anything.

elevenisland --input=. --output=. --formats=html
```

### Advanced

* (optional) Modify `data.json` to set global static data available to templates.
* Modify template format whitelist in `config.json`, the first one listed there is the default templating engine (default: `liquid`) and will be used to pre-process `data.json`.
* Markdown doesn’t render `data` by itself, but this tool will also pre-process it using the default templating engine (default: `ejs`).

## Tests

```
npm run test
npm run watch:test
```