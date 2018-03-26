# Handlebars

| Eleventy Short Name | File Extension | NPM Package                                                |
| ------------------- | -------------- | ---------------------------------------------------------- |
| `hbs`               | `.hbs`         | [`handlebars.js`](https://github.com/wycats/handlebars.js) |

You can override a `.hbs` file’s template engine. Read more at [Changing a Template’s Rendering Engine](/docs/engines.md).

## Set your own Library instance

_New in Eleventy `v0.3.0`:_ As an escape mechanism for advanced usage, pass in your own instance of the Handlebars library using the Configuration API.

```js
module.exports = function(eleventyConfig) {
  let handlebars = require("handlebars");
  eleventyConfig.setLibrary("hbs", handlebars);
};
```

## Supported Features

| Feature                                                                      | Syntax                                                                                                                                  |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Partials                                                                  | `{{> user}}` looks for `_includes/user.hbs`                                                                                             |
| ✅ Helpers                                                                   | `{{ helperName myObject }}` Handlebars calls them Helpers, but Eleventy calls them filters. Read more about [filters](/docs/filters.md) |
| ✅ [Eleventy Universal Filters](/docs/filters.md#built-in-universal-filters) | `{{ filterName myObject }}` (see `eleventyConfig.addFilter` documentation)                                                              |
