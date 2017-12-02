# elevenisland

Transform a directory of templates into HTML.

Works with:

* EJS (.ejs)
* Mustache (.mustache)
* Handlebars (.hbs)
* Markdown (.md)
* Haml (.haml)
* Pug (formerly Jade, .pug)
* Nunjucks (.njk)
* [Liquid (.liquid)](https://www.npmjs.com/package/liquidjs) (used by Jekyll)

## Usage

```
elevenisland

# Watch
elevenisland --watch

# Change directories
elevenisland --input=./templates --output=./dist

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

### Advanced

* Modify `data.json` to set global static data available to templates.
* Modify template format whitelist in `config.json`, the first one listed there is the default templating engine (default: `ejs`) and will be used to pre-process `data.json`.
* Markdown doesn’t render `data` by itself, but this tool will also pre-process it using the default templating engine (default: `ejs`).

## Tests

```
npm run test
npm run watch:test
```