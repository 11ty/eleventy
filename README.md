# eleventy

Transform a directory of templates into HTML.

Works with:

* HTML (`.html`)
* Markdown (`.md`) (using [`markdown-it`](https://github.com/markdown-it/markdown-it))
* [Liquid](https://www.npmjs.com/package/liquidjs) (`.liquid`) (used by Jekyll)
* [EJS](https://www.npmjs.com/package/ejs) (`.ejs`)
* [Handlebars](https://github.com/wycats/handlebars.js) (`.hbs`)
* [Mustache](https://github.com/janl/mustache.js/) (`.mustache`)
* [Haml](https://github.com/tj/haml.js) (`.haml`)
* [Pug](https://github.com/pugjs/pug) (formerly Jade, `.pug`)
* [Nunjucks](https://mozilla.github.io/nunjucks/) (`.njk`)
* JavaScript Template Literals (`.jstl`)

## Usage

```
# Searches the current directory, outputs to ./_site
eleventy

# Automatically render changes to template files.
eleventy --watch

# Override default directories for input/output
eleventy --input=./templates --output=./dist

# Control which template types get translated
eleventy --formats=md,html,ejs

# Find out the most up-to-date list of commands (there are more)
eleventy --help
```

### Examples

```
# Watch a directory for any changes to markdown files, then
# automatically parse and output as HTML files, respecting
# directory structure.

eleventy --input=. --output=. --watch --formats=md
```

#### Don’t overwrite HTML templates

Template types output to HTML. When you take an HTML file as input and attempt to write it to the same directory, we add an "-output.html" suffix to the output file name. See the `htmlOutputSuffix` configuration option.

```
# Adds `-output` to file names to avoid overwriting matching files.

eleventy --input=. --output=. --formats=html
```

### Data

#### Front Matter on any Template

You can use front matter on any template file to add local data. Here are a few keys we use for special things:

* `permalink`: Add in front matter to change the output target of the current template. You can use template syntax for variables here. [Read more about Permalinks](docs/permalinks.md).
* `layout`: Wrap current template with a layout template found in the `_includes` folder.
* `pagination`: (when enabled in front matter) [Read more about Pagination](docs/pagination.md).

##### Special template variables:

* `pkg`: The local project’s `package.json` values.

#### Data Files (Optional)

Optionally add data files to add global static data available to all templates. Uses the `dir.data` configuration option. [Read more about Template Data Files](docs/data.md).

### Ignore files (Optional)

Add an `.eleventyignore` file to the _root of your input directory_ for a new line-separated list of files that will not be processed. Eleventy will also ignore paths listed in your project’s `.gitignore` file.

### Configuration (Optional)

Add an `.eleventy.js` file to root directory of your project to override these configuration options with your own preferences. Example:

```
module.exports = {
  dir: {
    input: "views"
  }
};
```

| Configuration Option Key | Default Option                                                             | Valid Options                                | Command Line Override | Description                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------- | -------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `dir.input`              | `.`                                                                        | _Any valid directory._                       | `--input`             | Controls the top level directory inside which the templates should be found.                                                                    |
| `dir.includes`           | `_includes`                                                                | _Any valid directory inside of `dir.input`._ | N/A                   | Controls the directory inside which the template includes/extends/partials/etc can be found.                                                    |
| `dir.data`               | `_data`                                                                    | _Any valid directory inside of `dir.input`._ | N/A                   | Controls the directory inside which the global data template files, available to all templates, can be found.                                   |
| `dir.output`             | `_site`                                                                    | _Any valid directory._                       | `--output`            | Controls the directory inside which the transformed finished templates can be found.                                                            |
| `dataTemplateEngine`     | `ejs`                                                                      | _A valid template engine_ or `false`         | N/A                   | Run the `data.dir` global data files through this template engine before transforming it to JSON.                                               |
| `markdownTemplateEngine` | `liquid`                                                                   | _A valid template engine_ or `false`         | N/A                   | Run markdown through this template engine before transforming it to HTML.                                                                       |
| `htmlTemplateEngine`     | `liquid`                                                                   | _A valid template engine_ or `false`         | N/A                   | Run HTML templates through this template engine before transforming it to (better) HTML.                                                        |
| `templateFormats`        | `["liquid", "ejs", "md", "hbs", "mustache", "haml", "pug", "njk", "html"]` | _Any combination of these_                   | `--formats`           | Specify which type of templates should be transformed.                                                                                          |
| `htmlOutputSuffix`       | `-output`                                                                  | `String`                                     | N/A                   | If the input and output directory match, HTML files will have this suffix added to their output filename (to prevent overwriting the template). |
| `handlebarsHelpers`      | `{}`                                                                       | `Object`                                     | N/A                   | The helper functions passed to `Handlebars.registerHelper`. Helper names are keys, functions are the values.                                    |

### Template Engine Features

Here are the features tested with each template engine that use external files and thus are subject to setup and scaffolding.

| Engine     | Feature                             | Syntax                                                                            |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| ejs        | ✅ Include (Preprocessor Directive) | `<% include /user/show %>` looks for `_includes/show/user.ejs`                    |
| ejs        | ✅ Include (pass in Data)           | `<%- include('/user/show', {user: 'Ava'}) %>` looks for `_includes/user/show.ejs` |
| Liquid     | ✅ Include                          | `{% include 'show/user' %}` looks for `_includes/show/user.liquid`                |
| Liquid     | ✅ Include (pass in Data)           | `{% include 'user' with 'Ava' %}`                                                 |
| Liquid     | ✅ Include (pass in Data)           | `{% include 'user', user1: 'Ava', user2: 'Bill' %}`                               |
| Mustache   | ✅ Partials                         | `{{> user}}` looks for `_includes/user.mustache`                                  |
| Handlebars | ✅ Partials                         | `{{> user}}` looks for `_includes/user.hbs`                                       |
| Handlebars | ✅ Helpers                          | See `handlebarsHelpers` configuration options.                                    |
| HAML       | ❌ but 🔜 Filters                   |                                                                                   |
| Pug        | ✅ Includes                         | `include /includedvar.pug` looks in `_includes/includedvar.pug`                   |
| Pug        | ✅ Excludes                         | `extends /layout.pug` looks in `_includes/layout.pug`                             |
| Nunjucks   | ✅ Includes                         | `{% include 'included.njk' %}` looks in `_includes/included.njk`                  |
| Nunjucks   | ✅ Extends                          | `{% extends 'base.njk' %}` looks in `_includes/base.njk`                          |
| Nunjucks   | ✅ Imports                          | `{% import 'macros.njk' %}` looks in `_includes/macros.njk`                       |

_Careful, the liquidjs npm package syntax does not match the [default Jekyll Liquid include syntax](https://jekyllrb.com/docs/includes/). Specifically, includes file names are quoted._

## Tests

```
npm run test
npm run watch:test
```
