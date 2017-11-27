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

## Usage

```
elevenisland

# Watch
elevenisland --watch
```

### Advanced

* Modify `data.json` to set global static data available to templates.
* Modify template format whitelist in `config.json`, the first one listed there is the default templating engine (default: `ejs`) and will be used to pre-process `data.json`.
* Markdown doesn’t render `data` by itself, but this tool will also pre-process it using the default templating engine (default: `ejs`).

## TODO

* Partials/helpers
* Think about default transforming the current directory instead of `templates/`

## Tests

```
npm run test
```