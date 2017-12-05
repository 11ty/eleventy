# elevenisland

Transform a directory of templates into HTML.

Works with:

* HTML (`html`)
* [Liquid](https://www.npmjs.com/package/liquidjs) (`liquid`) (used by Jekyll)
* [EJS](https://www.npmjs.com/package/ejs) (`ejs`)
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

#### Don’t overwrite HTML templates

```
# Template types output to HTML. So when you take an HTML file
# as input and attempt to write it to the same directory, we
# add an "-output.html" suffix to the output file name.

elevenisland --input=. --output=. --formats=html
```

### Data

#### Front Matter on Everything

#### Global Data File

Optionally add a global data file (default is `data.json`) to set global static data available to templates. This file name is set in `config.json` under `globalDataFile`.

The global data file will be pre-processed by a template engine specified in `config.json` under `jsonDataTemplateEngine` and by default `package.json` data is available in the `_package` variable.

For example:

```
{
	"version": "<%= _package.version %>"
}
```

### Template Engines with Markdown and HTML

In the `config.json` file, the `markdownTemplateEngine` and `htmlTemplateEngine` values specify which templating engine will be used to process Markdown and HTML respectively. Set them to false to turn off templating engines and just do straight Markdown and HTML conversion (will still remove frontMatter and layout concatenation).

### Template Engine Includes

#### EJS

✅ Preprocessor Directive: `<% include user/show %>`
✅ Helper Function: `<%- include('user/show', {user: user}) %>`

#### Liquid

_Careful, this does not match the [default Jekyll include syntax](https://jekyllrb.com/docs/includes/)._

✅ `{% include 'color' %}`
✅ `{% include 'color' with 'red' %}`
✅ `{% include 'color', color: 'yellow', shape: 'square' %}`

## Tests

```
npm run test
npm run watch:test
```