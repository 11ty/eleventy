# HAML

| Eleventy Short Name | File Extension | NPM Package    |
| ------------------- | -------------- | -------------- |
| `haml`              | `.haml`        | [`haml.js`](c) |

You can override a `.haml` file’s template engine. Read more at [Changing a Template’s Rendering Engine](/docs/engines.md).

## Set your own Library instance

_New in Eleventy `v0.3.0`:_ As an escape mechanism for advanced usage, pass in your own instance of the HAML library using the Configuration API.

```js
module.exports = function(eleventyConfig) {
  let haml = require("hamljs");
  eleventyConfig.setLibrary("haml", haml);
};
```

## Supported Features

| Feature                                                                          | Syntax                                                                 |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| <!--                                                                             | _TODO_ Filters                                                         |  |
| _TODO_ [Eleventy Universal Filters](/docs/filters.md#built-in-universal-filters) | `:filterName some text` (see `eleventyConfig.addFilter` documentation) |

-->
