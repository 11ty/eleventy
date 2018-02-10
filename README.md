# eleventy 🕚

A simpler static site generator. An alternative to Jekyll. Written in JavaScript. Transforms a directory of templates (of varying types) into HTML.

Works with:

* HTML (`.html`)
* Markdown (`.md`) (using [`markdown-it`](https://github.com/markdown-it/markdown-it))
* [Liquid](https://www.npmjs.com/package/liquidjs) (`.liquid`) (used by Jekyll)
* [Nunjucks](https://mozilla.github.io/nunjucks/) (`.njk`)
* [Handlebars](https://github.com/wycats/handlebars.js) (`.hbs`)
* [Mustache](https://github.com/janl/mustache.js/) (`.mustache`)
* [EJS](https://www.npmjs.com/package/ejs) (`.ejs`)
* [Haml](https://github.com/tj/haml.js) (`.haml`)
* [Pug](https://github.com/pugjs/pug) (formerly Jade, `.pug`)
* JavaScript Template Literals (`.jstl`) (\`strings with backticks\`)

## Table of Contents

* [Getting Started](#getting-started)
* [Command line usage](#command-line-usage)
* [Using Data](#using-data-optional)
* [Ignore Files](#ignore-files-optional)
* [Configuration](#configuration-optional)
* [Template Engine Features](#template-engine-features)
* [Tests](#tests)
* [Competitors](#competitors)
* [Roadmap](#major-roadmapped-features)

### Read More at:

* [Changing a Template’s Rendering Engine](docs/engines.md)
* [Collections](docs/collections.md), grouping content together
* [Common Pitfalls](docs/pitfalls.md)
* [Custom Filters, Helpers, Tags](docs/filters.md)
* [Pagination](docs/pagination.md), splitting content to multiple files
* [Pass-through file copy](docs/copy.md) for images, JS, CSS
* [Plugins](docs/plugins.md)
* [Permalinks](docs/permalinks.md), map content to a new output location
* [Template Data Files](docs/data.md)
* [Template Layouts](docs/layouts.md)

## Getting Started

Requires version 8 of Node.js or higher.

```
npm install -g @11ty/eleventy
```

Available [on npm](https://www.npmjs.com/package/@11ty/eleventy). Previously known as [`eleventy-cli`](https://www.npmjs.com/package/eleventy-cli). [Read more about local installation.](docs/install-local.md)

### Run Eleventy

Make a directory with your project in it. Don’t include `~ $` when you run these commands.

```
~ $ mkdir eleventy-sample
~ $ cd eleventy-sample
```

Run `eleventy`:

```
~/eleventy-sample $ eleventy
Wrote 0 files in 0.02 seconds
```

Makes sense—this is an empty folder with no templates inside. So, let’s make a few templates.

```
~/eleventy-sample $ echo "<!doctype html><title>Page title</title>" > index.html
~/eleventy-sample $ echo "# Page header" > README.md
```

We’ve now created an HTML template and a markdown template. Now run `eleventy` again:

```
~/eleventy-sample $ eleventy
Writing _site/README/index.html from ./README.md
Writing _site/index.html from ./index.html
Wrote 2 files in 0.10 seconds
```

This will compile any content templates in the current directory or subdirectories into the output folder (defaults to `_site`). Congratulations—you made something with eleventy! Now put it to work with templating syntax, front matter, and data files (read on below).

### See more sample projects

1. [eleventy-base-blog](https://github.com/11ty/eleventy-base-blog): How to build a blog web site with Eleventy.
1. [@Heydon](https://github.com/heydon)’s lovely [Inclusive Web Design Checklist, converted to use `eleventy`](https://github.com/11ty/eleventy-inclusive-design-checklist). The [original](https://github.com/Heydon/inclusive-design-checklist) project took a JSON file and converted it HTML with some one-off JavaScript. This uses eleventy to transform the data using a nunjucks template, resulting in a cleaner, templated setup.
1. [11ty-logo](https://github.com/11ty/logo) generates a template with `eleventy` that has hundreds of different font combinations in an attempt to pick a logo.
1. Have a suggestion? [File an issue!](https://github.com/11ty/eleventy/issues/new?labels=sample-project)

## Command line usage

```
# Searches the current directory, outputs to ./_site
eleventy

# Equivalent to
eleventy --input=. --output=_site

# Automatically run when input template files change.
eleventy --watch

# Override the default eleventy project config filename (.eleventy.js)
eleventy --config=myeleventyconfig.js

# Use only a subset of template types
eleventy --formats=md,html,ejs

# Find out the most up-to-date list of commands (there are more)
eleventy --help
```

### Debugging

Having trouble? Want to see what Eleventy is doing behind the scenes? Use `DEBUG` mode. We’re taking advantage of the [excellent `debug` package](https://www.npmjs.com/package/debug) for this. Enable with the `DEBUG` env variable, either specific to eleventy (`DEBUG=Eleventy*`) or globally (`DEBUG=*`):

```
DEBUG=Eleventy* eleventy
```

This will tell you exactly what directories Eleventy is using for data, includes, input, and output. It’ll tell you what search globs it uses to find your templates and what templates it finds. If you’re having trouble, enable this.

Read more at the [`debug` package documentation](https://www.npmjs.com/package/debug).

### Example: Default options

```
eleventy --input=. --output=_site
```

A `template.md` in the current directory will be rendered to `_site/template/index.html`. [Read more at Permalinks](docs/permalinks.md)

### Example: Same Input and Output

Yes, you can use the same `input` and `output` directories, like so:

```
# Parse and write Markdown to HTML, respecting directory structure.
eleventy --input=. --output=. --formats=md
```

⚠️ Careful with `--formats=html` here! If you run eleventy more than once, it’ll try to process the output files too. Read more at [Common Pitfalls](/docs/pitfalls.md#same-input-output).

## Using Data (optional)

### Front Matter on any Template

You may use front matter on any template file to add local data. Front matter looks like this:

```
---
title: My page title
---
<!doctype html>
<html>
<title>{{ title }}</title>
…
```

This allows you to assign data values right in the template itself. There are special keys in front matter that are used for special things in Eleventy, like `permalink`, `pagination`, `layout`, `tags`, and `date`. [Read more about special keys in front matter data](docs/data.md).

### Data Files

Optionally add data files to add global static data available to all templates. Uses the `dir.data` configuration option. [Read more about Using Data](docs/data.md).

### Special Variables

Note that `{{ title }}` above outputs the `title` data value (this can come from front matter or an external data file). Eleventy also exposes a few other variables to your templates:

* `pkg`: The local project’s `package.json` values.
* `pagination`: (When enabled in front matter) [Read more about Pagination](docs/pagination.md).
* `collections`: Lists of all of your content, grouped by tags. [Read more about Collections](docs/collections.md)
* `page`: Has information about the current page. Currently holds: `{ url: "/current/page/url.html", date: [JS Date Object for current page] }`. Useful for finding the current page in a collection. [Read more about Collections](docs/collections.md) (look at _Example: Navigation Links with an `active` class added for on the current page_).

## Ignore files (optional)

Add an `.eleventyignore` file to the _root of your input directory_ for a new line-separated list of files (or globs) that will not be processed. Paths listed in your project’s `.gitignore` file are automatically ignored.

## Configuration (optional)

Add an `.eleventy.js` file to root directory of your project to override these configuration options with your own preferences. Example:

```
module.exports = {
  dir: {
    input: "views"
  }
};
```

| Configuration Option Key | Default Option                                    | Valid Options                                | Command Line Override             | Description                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------- | -------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dir.input`              | `.`                                               | _Any valid directory._                       | `--input`                         | Controls the top level directory inside which the templates should be found.                                                                                                      |
| `dir.includes`           | `_includes`                                       | _Any valid directory inside of `dir.input`._ | N/A                               | Controls the directory inside which the template includes/extends/partials/etc can be found.                                                                                      |
| `dir.data`               | `_data`                                           | _Any valid directory inside of `dir.input`._ | N/A                               | Controls the directory inside which the global data template files, available to all templates, can be found.                                                                     |
| `dir.output`             | `_site`                                           | _Any valid directory._                       | `--output`                        | Controls the directory inside which the transformed finished templates can be found.                                                                                              |
| `dataTemplateEngine`     | `liquid`                                          | _A valid template engine_ or `false`         | N/A                               | Run the `data.dir` global data files through this template engine before transforming it to JSON.                                                                                 |
| `markdownTemplateEngine` | `liquid`                                          | _A valid template engine_ or `false`         | N/A                               | Run markdown through this template engine before transforming it to HTML.                                                                                                         |
| `htmlTemplateEngine`     | `liquid`                                          | _A valid template engine_ or `false`         | N/A                               | Run HTML templates through this template engine before transforming it to (better) HTML.                                                                                          |
| `templateFormats`        | `liquid,ejs, md,hbs, mustache,haml, pug,njk,html` | _Any combination of these_                   | `--formats`                       | Specify which type of templates should be transformed.                                                                                                                            |
| `pathPrefix`             | `/`                                               | _A prefix directory added to links_          | `--pathprefix` _(New in v0.2.11)_ | Used by the url filter and inserted at the beginning of all href links. Use if your blog lives in a subdirectory on your web server.                                              |
| `passthroughFileCopy`    | `true`                                            | `true` or `false`                            | N/A                               | Files found (that aren’t templates) from white-listed file extensions will pass-through to the output directory. [Read more about Pass-through Copy](docs/copy.md).               |
| `htmlOutputSuffix`       | `-o`                                              | `String`                                     | N/A                               | If the input and output directory match, `index.html` files will have this suffix added to their output filename to prevent overwriting the template.                             |
| `filters`                | `{}`                                              | `Object`                                     | N/A                               | Filters can transform output on a template. Take the format `function(str, outputPath) { return str; }`. For example, use a filter to format an HTML file with proper whitespace. |

### Configuration API

If you expose your config as a function instead of an object, we’ll pass in a `config` argument that you can use!

```
module.exports = function(config) {
  return {
    dir: {
      input: "views"
    }
  };
};
```

This allows you to customize your template engines by using the Config helper methods.

#### Add Tags/Filters to Template Engines

Read more about [filters](docs/filters.md).

#### Add custom collections

Read more about [Collections: Advanced Custom Filtering and Sorting](docs/collections.md#advanced-custom-filtering-and-sorting).

#### Add official or third-party plugins

Read more about [Plugins](docs/plugins.md).

## Template Engine Features

Here are the features tested with each template engine that use external files and thus are subject to setup and scaffolding.

| Engine     | Feature                             | Syntax                                                                            |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| ejs        | ✅ Include (Preprocessor Directive) | `<% include /user/show %>` looks for `_includes/show/user.ejs`                    |
| ejs        | ✅ Include (pass in Data)           | `<%- include('/user/show', {user: 'Ava'}) %>` looks for `_includes/user/show.ejs` |
| Liquid     | ✅ Include                          | `{% include 'show/user' %}` looks for `_includes/show/user.liquid`                |
| Liquid     | ✅ Include (pass in Data)           | `{% include 'user' with 'Ava' %}`                                                 |
| Liquid     | ✅ Include (pass in Data)           | `{% include 'user', user1: 'Ava', user2: 'Bill' %}`                               |
| Liquid     | ✅ Custom Filters                   | `{{ name | upper }}` (see `config.addLiquidFilter` documentation)                 |
| Liquid     | ✅ Custom Tags                      | `{% upper name %}` (see `config.addLiquidTag` documentation)                      |
| Mustache   | ✅ Partials                         | `{{> user}}` looks for `_includes/user.mustache`                                  |
| Handlebars | ✅ Partials                         | `{{> user}}` looks for `_includes/user.hbs`                                       |
| Handlebars | ✅ Helpers                          | See `handlebarsHelpers` configuration option.                                     |
| HAML       | ❌ but 🔜 Filters                   |                                                                                   |
| Pug        | ✅ Includes                         | `include /includedvar.pug` looks in `_includes/includedvar.pug`                   |
| Pug        | ✅ Excludes                         | `extends /layout.pug` looks in `_includes/layout.pug`                             |
| Nunjucks   | ✅ Includes                         | `{% include 'included.njk' %}` looks in `_includes/included.njk`                  |
| Nunjucks   | ✅ Extends                          | `{% extends 'base.njk' %}` looks in `_includes/base.njk`                          |
| Nunjucks   | ✅ Imports                          | `{% import 'macros.njk' %}` looks in `_includes/macros.njk`                       |
| Nunjucks   | ✅ Filters                          | Read more about [Filters](docs/filters.md)                                        |

## Tests

* Build Status: [![Build Status](https://travis-ci.org/11ty/eleventy.svg?branch=master)](https://travis-ci.org/11ty/eleventy)
* [Code Coverage Statistics](docs/coverage.md)

```
npm run test
```

## Competitors

* [Jekyll](https://jekyllrb.com/) (Ruby)
* [Hugo](http://gohugo.io/) (Go)
* [Hexo](https://hexo.io/) (JavaScript)
* [Gatsby](https://www.gatsbyjs.org/) (JavaScript using React)
* [Nuxt](https://www.staticgen.com/nuxt) (JavaScript using Vue)
* _More at [staticgen.com](https://www.staticgen.com/)_

## Major Roadmapped Features

* [x] Pagination
* [x] Tagging of content
* [x] Plugin system
* [ ] Extensibility with system-wide content mapping **IN PROGRESS**
* [ ] Components system for development reusability
