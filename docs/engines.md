# Changing a Template’s Rendering Engine

_(New in Eleventy `v0.2.14`)_ There are a couple of different ways you can tell Eleventy how you want to process a file:

1. The file extension (importantly, this is also used to find files to process).
2. [Configuration options](/README.md#configuration-optional)

* `markdownTemplateEngine`: The default global template engine to pre-process markdown files. Use `false` to avoid pre-processing and only transform markdown.
* `htmlTemplateEngine`: The default global template engine to pre-process HTML files. Use `false` to avoid pre-processing and passthrough copy the content (HTML is not transformed, so technically this could be any plaintext).

3. `templateEngineOverride` in the template’s front matter. Should be _one_ templating engine (`liquid`) or markdown paired with another templating engine (`liquid,md`). See examples below.

## `templateEngineOverride` Examples

### Replace with a single templating engine

If your file is called `example.liquid`—instead of `liquid`, this will be parsed as a `njk` Nunjucks template:

```
---
templateEngineOverride: njk
---
```

### Special case: pairing a templating engine with `md` Markdown

Remember that—by default—Markdown files are processed with an additional preprocessor template engine set globally with the `markdownTemplateEngine` configuration option. So, when using `templateEngineOverride` on markdown files be sure to list each templating engine you’d like to use.

For example, you may want to process `njk` Nunjucks first and then `md` markdown afterwards. Markdown is supported either by itself or with another engine. No other templating engines can be combined in this way—Markdown is the exception here. Any other combination attempt will throw an error.

#### Markdown and nothing else

```
---
templateEngineOverride: md
---
```

#### Nunjucks and then Markdown

```
---
templateEngineOverride: njk,md
---
```

### Use nothing (no transformations)

Any falsy value here will just copy the template content without transformation.

```
---
templateEngineOverride: false
---
```
