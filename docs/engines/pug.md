# Pug (formerly Jade)

| Eleventy Short Name | File Extension | NPM Package                           |
| ------------------- | -------------- | ------------------------------------- |
| `pug`               | `.pug`         | [`pug`](https://github.com/pugjs/pug) |

You can override a `.pug` file’s template engine. Read more at [Changing a Template’s Rendering Engine](/docs/engines.md).

## Set your own Library instance

_New in Eleventy `v0.3.0`:_ As an escape mechanism for advanced usage, pass in your own instance of the Pug library using the Configuration API.

```js
module.exports = function(eleventyConfig) {
  let pug = require("pug");
  eleventyConfig.setLibrary("pug", pug);
};
```

## Compile/Render Options

_New in Eleventy `v0.2.15`:_ Set compile/render options using the Configuration API. See all [Pug options](https://pugjs.org/api/reference.html#options).

```js
module.exports = function(eleventyConfig) {
  eleventyConfig.setPugOptions({ debug: true });
};
```

## Supported Features

| Feature                                              | Syntax                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| ✅ Includes (Absolute)                               | `include /includedvar.pug` looks in `_includes/includedvar.pug` |
| ✅ Includes (Relative) _(New in Eleventy `v0.2.15`)_ | `include includedvar.pug` looks in `_includes/includedvar.pug`  |
| ✅ Extends (Absolute)                                | `extends /layout.pug` looks in `_includes/layout.pug`           |
| ✅ Extends (Relative) _(New in Eleventy `v0.2.15`)_  | `extends layout.pug` looks in `_includes/layout.pug`            |
