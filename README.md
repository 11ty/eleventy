# elevenisland

Transform a directory of templates into HTML.

Works with:

* HTML (`html`)
* [Liquid](https://www.npmjs.com/package/liquidjs) (`liquid`) (used by Jekyll)
* [EJS](https://www.npmjs.com/package/ejs) (`ejs`)
* [Handlebars](https://github.com/wycats/handlebars.js) (`hbs`)
* [Mustache](https://github.com/janl/mustache.js/) (`mustache`)
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

### Template Engine Includes/Partials/Helpers

#### EJS Includes

✅ Preprocessor Directive: `<% include user %>` looks for `_includes/user.ejs`
✅ Preprocessor Directive Subdirectory: `<% include user/show %>` looks for `_includes/user/show.ejs`
✅ Helper, pass in local data: `<%- include('user/show', {user: 'Ava'}) %>` looks for `_includes/user/show.ejs`

#### Liquid Includes

_Careful, this does not match the [default Jekyll Liquid include syntax](https://jekyllrb.com/docs/includes/)._

✅ `{% include 'user' %}` looks for `_includes/user.liquid`
✅ Pass in local data: `{% include 'user' with 'Ava' %}`
✅ Pass in local data: `{% include 'user', user1: 'Ava', user2: 'Bill' %}`

#### Mustache.js Partials

✅ `{{> user}}` looks for `_includes/user.mustache`

#### handlebars.js Partials

✅ `{{> user}}` looks for `_includes/user.hbs`
🔜 Helpers


## Tests

```
npm run test
npm run watch:test
```