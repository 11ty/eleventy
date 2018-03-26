# Mustache

| Eleventy Short Name | File Extension | NPM Package                                           |
| ------------------- | -------------- | ----------------------------------------------------- |
| `mustache`          | `.mustache`    | [`mustache.js`](https://github.com/janl/mustache.js/) |

You can override a `.mustache` file’s template engine. Read more at [Changing a Template’s Rendering Engine](/docs/engines.md).

## Set your own Library instance

_New in Eleventy `v0.3.0`:_ As an escape mechanism for advanced usage, pass in your own instance of the Mustache library using the Configuration API.

```js
module.exports = function(eleventyConfig) {
  let mustache = require("mustache");
  eleventyConfig.setLibrary("mustache", mustache);
};
```

## Supported Features

| Feature     | Syntax                                           |
| ----------- | ------------------------------------------------ |
| ✅ Partials | `{{> user}}` looks for `_includes/user.mustache` |
