# Filters, Tags, etc.

Various template engines can be extended with custom `filters` or custom tags.

_Experimental._ Eleventy provides a few universal filters that can be used in supported template types (currently Nunjucks, Liquid, and Handlebars).

More information:

* [Nunjucks Filters](https://mozilla.github.io/nunjucks/templating.html#filters)
* [Handlebars Helpers](http://handlebarsjs.com/#helpers)
* [Liquid Filters](https://github.com/harttle/liquidjs#register-filters)
* [Liquid Tags](https://github.com/harttle/liquidjs#register-tags)

## Url

Works with the `pathPrefix` configuration option to properly normalize relative and absolute paths to your content.

```
<a href="{{ post.url | url }}">Liquid or Nunjucks Link</a>
```

### Sample URL Transformations

| Sample URL   | `pathPrefix` | Return value |
| ------------ | ------------ | ------------ |
| `''`         | `'/'`        | `'/'`        |
| `'/'`        | `'/'`        | `'/'`        |
| `'./'`       | `'/'`        | `'./'`       |
| `'..'`       | `'/'`        | `'..'`       |
| `'myDir'`    | `'/'`        | `'/myDir'`   |
| `'/myDir'`   | `'/'`        | `'/myDir'`   |
| `'./myDir'`  | `'/'`        | `'myDir'`    |
| `'../myDir'` | `'/'`        | `'../myDir'` |

| Sample URL   | `pathPrefix` | Return value       |
| ------------ | ------------ | ------------------ |
| `''`         | `'/rootDir'` | `'/rootDir/'`      |
| `'/'`        | `'/rootDir'` | `'/rootDir/'`      |
| `'./'`       | `'/rootDir'` | `'./'`             |
| `'..'`       | `'/rootDir'` | `'..'`             |
| `'myDir'`    | `'/rootDir'` | `'/rootDir/myDir'` |
| `'/myDir'`   | `'/rootDir'` | `'/rootDir/myDir'` |
| `'./myDir'`  | `'/rootDir'` | `'myDir'`          |
| `'../myDir'` | `'/rootDir'` | `'../myDir'`       |

## Slug

Uses the `slugify` package to convert a string into a URL slug. Can be used in pagination or permalinks.

```
{{ "My Title" | slug }} -> `my-title`
```
