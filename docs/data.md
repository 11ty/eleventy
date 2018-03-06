# Using Data

## Front Matter Data

Of course, you can also add data in your template front matter, like this:

```
---
title: My page title
---
<!doctype html>
<html>
…
```

Locally assigned front matter values override things further up the chain. Note also that layouts can contain front matter variables as well. Leaf template front matter takes precedence over layout front matter.

### Special front matter keys:

Here are a few special front matter keys you can use:

* `permalink`: Add in front matter to change the output target of the current template. You can use template syntax for variables here. [Read more about Permalinks](permalinks.md).
* `layout`: Wrap current template with a layout template found in the `_includes` folder. [Read more about Layouts](layouts.md).
* `pagination`: Enable to iterate over data. Output multiple HTML files from a single template. [Read more about Pagination](pagination.md).
* `tags`: A single string or array that identifies that a piece of content is part of a collection. Collections can be reused in any other template. [Read more about Collections](collections.md).
* `date`: Override the default date (file creation) to customize how the file is sorted in a collection. [Read more about Collections](collections.md).
* `templateEngineOverride`: Override the template engine on a per-file basis, usually configured with a file extension or globally using the `markdownTemplateEngine` and `htmlTemplateEngine` configuration options. [Read more about Changing a Template’s Rendering Engine](engines.md).

## External Data Files

Your global data folder is controlled by the `dir.data` configuration option. All `json` files in this directory will be parsed into a global data object available to all templates.

If a data file is in a subdirectory, the subdirectory structure will inform your global data object structure. For example, consider `_data/users/userList.json` with the following data:

```
[
  "user1",
  "user2",
  "user3",
  …
]
```

This data will be available to your templates like so:

```
{
  users: {
    userList: [
      "user1",
      "user2",
      "user3",
      …
    ]
  }
}
```

### Template and Directory Specific Data Files

_(New in Eleventy `v0.2.14`)_ While it is useful to have globally available data to all of your templates, you may want some of your data to be available locally only to one specific template or to a directory of templates. For that use, we also search for JSON data files in specific places in your directory structure.

_Important exception:_ Template and Directory Specific Data Files are **not** processed through a templating engine. Global Data files are.

For example, consider a template located at `posts/subdir/my-first-blog-post.md`. Eleventy will look for data in the following places (starting with highest priority, local data keys override global data):

1. `posts/subdir/my-first-blog-post.json` (data only applied to `posts/my-first-blog-post.md`)
1. `posts/subdir/subdir.json` (on all templates in `posts/subdir/*`)
1. `posts/posts.json` (on all templates in `posts/**/*`, including subdirectories)
1. `_data/*` (global data files available to all templates)

_(Changed in Eleventy `v0.2.15` to search parent directories for data files—specifically step 3 above was added in the sequence)_

#### Apply a default layout to multiple templates

Try adding `{ "layout": "layouts/post.njk" }` to `posts/posts.json` to configure a layout for all of the templates inside of `posts/*`.

### Pre-processing

All data files will be pre-processed with the template engine specified under the `dataTemplateEngine` configuration option. Note that `package.json` data is available here under the `pkg` variable.

For example, if your `dataTemplateEngine` is using the default, `liquid`, you can do this:

```
{
  "version": "{{ pkg.version }}"
}
```
