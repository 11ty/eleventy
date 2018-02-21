# Filters, Tags, etc.

Various template engines can be extended with custom filters, helpers, or tags.

More information:

* [Nunjucks Filters](https://mozilla.github.io/nunjucks/templating.html#filters)
* [Handlebars Helpers](http://handlebarsjs.com/#helpers)
* [Liquid Filters](https://github.com/harttle/liquidjs#register-filters)
* [Liquid Tags](https://github.com/harttle/liquidjs#register-tags)

This can be customized using the Configuration API (an `.eleventy.js` file). Here are a few examples:

```
module.exports = function(eleventyConfig) {

  // Liquid
  eleventyConfig.addLiquidTag(name, function(tagToken, remainingTokens) {}, function(scope, hash) { … });
  eleventyConfig.addLiquidFilter(name, function(value) { … });

  // Nunjucks
  eleventyConfig.addNunjucksFilter(name, function(value) { … });

  // Handlebars
  eleventyConfig.addHandlebarsHelper(name, function(value) { … });

  // Universal filters (Experimental! Adds to Liquid, Nunjucks, and Handlebars)
  eleventyConfig.addFilter(name, function(value) { … });

  return {};
};
```

## Asynchronous Nunjucks Filters

_(New in Eleventy `v0.2.13`)_ By default, almost all templating engines are synchronous. Nunjucks supports some asynchronous behavior, like filters. Here’s how that works:

```
eleventyConfig.addNunjucksAsyncFilter("myAsyncFilter", function(value, callback) {
  window.setTimeout(function() {
    callback(null, "My Result");
  }, 100);
});
```

The last argument here is the callback function, the first argument of which is the error object and the second is the result data. Use this filter like you would any other: `{{ myValue | myAsyncFilter }}`.

Here’s a Nunjucks example with 2 arguments:

```
eleventyConfig.addNunjucksAsyncFilter("myAsyncFilter", function(value1, value2, callback) {
  window.setTimeout(function() {
    callback(null, "My Result");
  }, 100);
});
```

Multi-argument filters in Nunjucks are called like this: `{{ myValue1 | myAsyncFilter(myValue2) }}`.

## Universal Filters

_Experimental._ Eleventy provides a few universal filters that can be used in supported template types (currently Nunjucks, Liquid, and Handlebars). This allows you to add the filter in one place and it will be available in multiple templating engines.

### Built-in Universal Filters

#### Url

Works with the `pathPrefix` configuration option to properly normalize absolute paths in your content with the `pathPrefix` added. Useful if you host your site on GitHub Pages, which normally live in a subdirectory, e.g. `https://11ty.github.io/eleventy-base-blog/`. We set `pathPrefix: "/eleventy-base-blog/"` and our absolute links all have this prepended to the beginning.

_If you don’t need `pathPrefix` (or don’t ever plan on moving your site’s top-level directory structure), you probably don’t need to use the `url` filter._

```
<a href="{{ post.url | url }}">Liquid or Nunjucks Link</a>
```

##### Sample URL Transformations

| Sample URL   | `pathPrefix` | Return value                                                                           |
| ------------ | ------------ | -------------------------------------------------------------------------------------- |
| `''`         | `'/'`        | `'.'` ⚠️ This style is probably not what you want—careful!                             |
| `'/'`        | `'/'`        | `'/'`                                                                                  |
| `'./'`       | `'/'`        | `'./'`                                                                                 |
| `'..'`       | `'/'`        | `'..'`                                                                                 |
| `'myDir'`    | `'/'`        | `'myDir'` ⚠️ This style is not safe for globally linking to other content. Be careful! |
| `'/myDir'`   | `'/'`        | `'/myDir'`                                                                             |
| `'./myDir'`  | `'/'`        | `'myDir'` ⚠️ This style is not safe for globally linking to other content. Be careful! |
| `'../myDir'` | `'/'`        | `'../myDir'`                                                                           |

| Sample URL   | `pathPrefix` | Return value                                                   |
| ------------ | ------------ | -------------------------------------------------------------- |
| `''`         | `'/rootDir'` | `'.'` ⚠️ This style is probably not what you want—careful!     |
| `'/'`        | `'/rootDir'` | `'/rootDir/'`                                                  |
| `'./'`       | `'/rootDir'` | `'./'`                                                         |
| `'..'`       | `'/rootDir'` | `'..'`                                                         |
| `'myDir'`    | `'/rootDir'` | `'myDir'` ⚠️ This style is probably not what you want—careful! |
| `'/myDir'`   | `'/rootDir'` | `'/rootDir/myDir'`                                             |
| `'./myDir'`  | `'/rootDir'` | `'myDir'` ⚠️ This style is probably not what you want—careful! |
| `'../myDir'` | `'/rootDir'` | `'../myDir'`                                                   |

#### Slug

Uses the `slugify` package to convert a string into a URL slug. Can be used in pagination or permalinks.

```
{{ "My Title" | slug }} -> `my-title`
```
