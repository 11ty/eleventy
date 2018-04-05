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

### Namespace the plugin additions

You can namespace parts of your configuration using `eleventyConfig.namespace`. This will add a string prefix to all filters, tags, helpers, collections, and transforms.

```
const pluginRss = require("@11ty/eleventy-plugin-rss");
module.exports = function(eleventyConfig) {
  eleventyConfig.namespace("myPrefix_", () => {
    // the rssLastUpdatedDate filter is now myPrefix_rssLastUpdatedDate
    eleventyConfig.addPlugin(pluginRss);
  });
};
```

This feature isn’t limited to plugins, you could use it yourself with `addFilter` or `addCollection` in your config but your code will be more readable if you just change the name string arguments manually (it’s your call).
