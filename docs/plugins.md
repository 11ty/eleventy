# Plugins

_(New in Eleventy `v0.2.13`)_ Plugins are custom code that Eleventy can import into a project from an external repository.

## List of Available Plugins:

* [`eleventy-plugin-rss`](https://github.com/11ty/eleventy-plugin-rss) is a collection of Nunjucks filters for RSS/Atom feed templates.
* [`eleventy-plugin-syntaxhighlight`](https://github.com/11ty/eleventy-plugin-syntaxhighlight) for custom syntax highlighting Liquid tags.

## Adding a plugin.

### Install the plugin through npm.

```
npm install @11ty/eleventy-plugin-rss --save
```

### Add the plugin to Eleventy in your config file

Your config file is probably named `.eleventy.js`.

```
const pluginRss = require("@11ty/eleventy-plugin-rss");
module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);
};
```
