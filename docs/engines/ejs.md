# EJS

| Eleventy Short Name | File Extension | NPM Package                                |
| ------------------- | -------------- | ------------------------------------------ |
| `ejs`               | `.ejs`         | [`ejs`](https://www.npmjs.com/package/ejs) |

You can override a `.ejs` file’s template engine. Read more at [Changing a Template’s Rendering Engine](/docs/engines.md).

## Set your own Library instance

_New in Eleventy `v0.3.0`:_ As an escape mechanism for advanced usage, pass in your own instance of the EJS library using the Configuration API.

```js
module.exports = function(eleventyConfig) {
  let ejs = require("ejs");
  eleventyConfig.setLibrary("ejs", ejs);
};
```

## Compile/Render Options

_New in Eleventy `v0.3.0`:_ See “Options” on the [EJS home page](http://ejs.co/).

```
module.exports = function(eleventyConfig) {
  eleventyConfig.setEjsOptions({
    // use <? ?> instead of <% %>
    delimiter: "?"
  });
};
```

## Supported Features

| Feature                             | Syntax                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| ✅ Include (Preprocessor Directive) | `<% include /user/show %>` looks for `_includes/user/show.ejs`                    |
| ✅ Include (pass in Data)           | `<%- include('/user/show', {user: 'Ava'}) %>` looks for `_includes/user/show.ejs` |
