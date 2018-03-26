# Nunjucks

| Eleventy Short Name | File Extension | NPM Package                                       |
| ------------------- | -------------- | ------------------------------------------------- |
| `njk`               | `.njk`         | [`nunjucks`](https://mozilla.github.io/nunjucks/) |

You can override a `.njk` file’s template engine. Read more at [Changing a Template’s Rendering Engine](/docs/engines.md).

## Use your Nunjucks Environment

_New in Eleventy `v0.3.0`:_ As an escape mechanism for advanced usage, pass in your own instance of a [Nunjucks Environment](https://mozilla.github.io/nunjucks/api.html#environment) using the Configuration API.

```js
module.exports = function(eleventyConfig) {
  let Nunjucks = require("nunjucks");
  let nunjucksEnvironment = new Nunjucks.Environment(
    new Nunjucks.FileSystemLoader("_includes")
  );

  eleventyConfig.setLibrary("njk", nunjucksEnvironment);
};
```

## Supported Features

| Feature                                                                      | Syntax                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| ✅ Includes                                                                  | `{% include 'included.njk' %}` looks in `_includes/included.njk`          |
| ✅ Extends                                                                   | `{% extends 'base.njk' %}` looks in `_includes/base.njk`                  |
| ✅ Imports                                                                   | `{% import 'macros.njk' %}` looks in `_includes/macros.njk`               |
| ✅ Filters                                                                   | Read more about [Filters](docs/filters.md)                                |
| ✅ [Eleventy Universal Filters](/docs/filters.md#built-in-universal-filters) | `{% name \| filterName %}` (see `eleventyConfig.addFilter` documentation) |
