# Permalinks

## Cool URIs don’t change

Eleventy automatically helps you make sure that [Cool URIs don’t change](https://www.w3.org/Provider/Style/URI.html).

> What to leave out…
> File name extension. This is a very common one. "cgi", even ".html" is something which will change. You may not be using HTML for that page in 20 years time, but you might want today's links to it to still be valid. The canonical way of making links to the W3C site doesn't use the extension.

Assuming your `--output` directory is the default, `_site`:

* `template.njk` outputs to `_site/template/index.html`, pairs nicely with `<a href="/template/">`
* `subdir/template.njk` outputs to `_site/subdir/template/index.html`, pairs nicely with `<a href="/subdir/template/">`

## Remapping Output (Permalink)

To remap your template’s output to a different path than the default, use the `permalink` key in the template’s front matter. If a subdirectory does not exist, it will be created.

```
---
permalink: this-is-a-new-path/subdirectory/testing/index.html
---
```

The above will write to `_site/this-is-a-new-path/subdirectory/testing/index.html`.

You may use data variables available here. These will be parsed with the current template’s rendering engine.

For example, in a Nunjucks template:

```
---
mySlug: this-is-a-new-path
permalink: subdir/{{ mySlug }}/index.html
---
```

Writes to `_site/subdir/this-is-a-new-path/index.html`.

### Pagination

Pagination variables also work here. [Read more about Pagination](pagination.md)
