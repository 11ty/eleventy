# Layouts

Layouts are templates that can be used to wrap other content. To denote that a piece of content should be wrapped in a template, simply use the `layout` key in your front matter, like so:

```
---
layout: mylayout.njk
title: My Rad Blog
---
# My Rad Markdown Blog Post
```

This will look for a `mylayout.njk` Nunjucks template file in your `_includes` folder (`_includes/mylayout.njk`). You can use any template type in your layout—it doesn’t have to match the template type of the content. An `ejs` template can use a `njk` layout, for example.

If you omit the file extension (`layout: mylayout`), eleventy will cycle through all of the supported template formats (`mylayout.*`) to look for a matching layout file.

Next, we need to create a `mylayout.njk` file. It can contain any type of text, but here we’re using HTML:

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
  </head>
  <body>
    {{ content | safe }}
  </body>
</html>
```

Note that the layout template will populate the `content` data with the child template’s content. Also note that we don’t want to double-escape the output, so we’re using the provided Nunjuck’s `safe` filter here (see more language double-escaping syntax below).

Layouts can contain their own front matter data! It’ll be merged with the content’s data on render (content data takes precedence, if conflicting keys arise).

All of this will output the following HTML content:

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Rad Blog</title>
  </head>
  <body>
    <h1>My Rad Markdown Blog Post
  </body>
</html>
```

## Layouts in a Subdirectory

As of Eleventy `v0.2.7`, layouts can be a full path inside of the `_includes` folder, like so:

```
---
layout: layouts/base.njk
---
```

This will look for `_includes/layouts/base.njk`.

## Prevent double-escaping in layouts

| Template Language | Unescaped Content (for layout content)                 | Comparison with an Escaped Output | Docs                                                                                 |
| ----------------- | ------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------ |
| Nunjucks          | `{{ content \| safe }}`                                | `{{ value }}`                     | [Docs](https://mozilla.github.io/nunjucks/templating.html#safe)                      |
| EJS               | `<%- content %>`                                       | `<%= value %>`                    | [Docs](https://www.npmjs.com/package/ejs#tags)                                       |
| Handlebars        | `{{{ content }}}` (triple stash)                       | `{{ value }}` (double stash)      | [Docs](http://handlebarsjs.com/#html-escaping)                                       |
| Mustache          | `{{{ content }}}` (triple stash)                       | `{{ value }}` (double stash)      | [Docs](https://github.com/janl/mustache.js#variables)                                |
| Liquid            | is by default unescaped so you can use `{{ content }}` | `{{ value \| escape}}`            | [Docs](http://shopify.github.io/liquid/filters/escape/)                              |
| HAML              | `! #{ content }`                                       | `= #{ content }`                  | [Docs](http://haml.info/docs/yardoc/file.REFERENCE.html#unescaping_html)             |
| Pug               | `!{content}`                                           | `#{value}`                        | [Docs](https://pugjs.org/language/interpolation.html#string-interpolation-unescaped) |

## Layout Chaining

Your layouts can also use a layout! Add the same `layout` front matter data to your layout template file and it’ll chain. Say we have a piece of content:

```
---
layout: mainlayout.njk
title: My Rad Blog
---
# My Rad Markdown Blog Post
```

We want to add a main element around our post’s content because we like accessibility. Here’s what `mainlayout.njk` would look like:

```
---
layout: mylayout.njk
---
<main>
  {{ content | safe }}
</main>
```

This would build on the previous `mylayout.njk` layout to write a file with:

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Rad Blog</title>
  </head>
  <body>
    <main>
      <h1>My Rad Markdown Blog Post
    </main>
  </body>
</html>
```

## Addendum about existing Templating features

It is worth noting that existing template reuse mechanisms built into different templating languages are still available to you. For instance, Nunjucks calls it [Template Inheritance](https://mozilla.github.io/nunjucks/templating.html#template-inheritance) and exposes with `{% extends %}`. Eleventy’s layout system exists a layer above this and exposes a nice multi-template-language mechanism to configure layouts in your content’s front matter and share data between them.
