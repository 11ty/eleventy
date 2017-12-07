# elevenisland

Transform a directory of templates into HTML.

Works with:

* HTML (`html`)
* Markdown (`md`) (using [`markdown-it`](https://github.com/markdown-it/markdown-it))
* [Liquid](https://www.npmjs.com/package/liquidjs) (`liquid`) (used by Jekyll)
* [EJS](https://www.npmjs.com/package/ejs) (`ejs`)
* [Handlebars](https://github.com/wycats/handlebars.js) (`hbs`)
* [Mustache](https://github.com/janl/mustache.js/) (`mustache`)
* [Haml](https://github.com/tj/haml.js) (`haml`)
* [Pug](https://github.com/pugjs/pug) (formerly Jade, `pug`)
* [Nunjucks](https://mozilla.github.io/nunjucks/) (`njk`)

## Usage

```
elevenisland

# Watch
elevenisland --watch

# Change directories
elevenisland --input=./templates --output=./dist

# Control which template types get translated
elevenisland --formats=md,html,ejs

# Use help to find out the most up-to-date list of commands
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

Optionally add a global data file (default is `data.json`) to set global static data available to templates. This file name is can be set using the `globalDataFile` configuration option.

The global data file will be pre-processed by a template engine specified under the `jsonDataTemplateEngine` configuration option. Note that `package.json` data is available to these options under the `_package` variable.

For example:

```
{
	"version": "<%= _package.version %>"
}
```

### Configuration to override Convention

|Configuration Option Key|Default Option|Valid Options|Description|
|---|---|---|---|
|`globalDataFile`|`data.json`|A valid JSON filename|Control the file name used for global data available to all templates.|
|`jsonDataTemplateEngine`|`ejs`|_A valid template engine_ or `false`|Run the `globalDataFile` through this template engine before transforming it to JSON.|
|`markdownTemplateEngine`|`liquid`|_A valid template engine_ or `false`|Run markdown through this template engine before transforming it to HTML.|
|`htmlTemplateEngine`|`liquid`|_A valid template engine_ or `false`|Run HTML templates through this template engine before transforming it to (better) HTML.|
|`templateFormats`|`["liquid","ejs","md","hbs","mustache","haml","pug","njk","html"]`|_Any combination of these_|Specify which type of templates should be transformed.|
|`dir.input`|`.`|_Any valid directory._|Controls the top level directory inside which the templates should be found.|
|`dir.layouts`|`_layouts`|_Any valid directory inside of `dir.input`._|Controls the directory inside which the elevenisland layouts can be found.|
|`dir.includes`|`_includes`|_Any valid directory inside of `dir.input`._|Controls the directory inside which the template includes/extends/partials/etc can be found.|
|`dir.output`|`_site`|_Any valid directory._|Controls the directory inside which the transformed finished templates can be found.|

### Template Engine Features

Here are the features tested with each template engine that use external files and thus are subject to setup and scaffolding.

#### EJS Includes

* ✅ Preprocessor Directive: `<% include /user %>` looks for `_includes/user.ejs`
* ✅ Preprocessor Directive in a subdirectory: `<% include /user/show %>` looks for `_includes/user/show.ejs`
* ✅ Helper, pass in local data: `<%- include('/user/show', {user: 'Ava'}) %>` looks for `_includes/user/show.ejs`

#### Liquid Includes

_Careful, this does not match the [default Jekyll Liquid include syntax](https://jekyllrb.com/docs/includes/)._

* ✅ `{% include 'user' %}` looks for `_includes/user.liquid`
* ✅ Pass in local data: `{% include 'user' with 'Ava' %}`
* ✅ Pass in local data: `{% include 'user', user1: 'Ava', user2: 'Bill' %}`

#### Mustache Partials

* ✅ `{{> user}}` looks for `_includes/user.mustache`

#### Handlebars Partials

* ✅ `{{> user}}` looks for `_includes/user.hbs`
* ❌ Helpers

#### HAML

* ❌ Filters

#### Pug

* ✅ Includes `include /includedvar.pug` looks in `_includes/includedvar.pug`
* ✅ Extends `extends /layout.pug` looks in `_includes/layout.pug`

#### Nunjucks

* ✅ Includes `{% include 'included.njk' %}` looks in `_includes/included.njk`
* ✅ Extends `{% extends 'base.njk' %}` looks in `_includes/base.njk`
* ✅ Imports `{% import 'macros.njk' %}` looks in `_includes/macros.njk`

## Tests

```
npm run test
npm run watch:test
```