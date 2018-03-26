# Markdown

| Eleventy Short Name | File Extension | NPM Package                                                |
| ------------------- | -------------- | ---------------------------------------------------------- |
| `md`                | `.md`          | [`markdown-it`](https://www.npmjs.com/package/markdown-it) |

Markdown files can be optionally pre-processed with an additional template engine. This can be configured on a per-template basis or globally. Read more at [Changing a Template’s Rendering Engine](/docs/engines.md).

## Library Options

### Defaults

* `html: true` (default is `false`)

The above options are different than the default `markdown-it` options. See [all `markdown-it` options](https://github.com/markdown-it/markdown-it#init-with-presets-and-options).

### Use your own options

_New in Eleventy `v0.3.0`:_ Pass in your own instance of the Markdown library using the Configuration API. See [all `markdown-it` options](https://github.com/markdown-it/markdown-it#init-with-presets-and-options).

```js
module.exports = function(eleventyConfig) {
  let markdownIt = require("markdown-it");
  let options = {
    html: true,
    breaks: true,
    linkify: true
  };

  eleventyConfig.setLibrary("md", markdownIt(options));
};
```

## Add your own plugins

_New in Eleventy `v0.3.0`:_ Pass in your own `markdown-it` plugins using the `setLibrary` Configuration API method (building on the method described in “Using your own options”).

1. Find your [own `markdown-it` plugin on NPM](https://www.npmjs.com/search?q=keywords:markdown-it-plugin)
2. `npm install` the plugin.

```js
module.exports = function(eleventyConfig) {
  let markdownIt = require("markdown-it");
  let markdownItEmoji = require("markdown-it-emoji");
  let options = {};

  eleventyConfig.setLibrary("md", markdownIt(options).use(markdownItEmoji));
};
```
