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

### Pre-processing

All data files will be pre-processed with the template engine specified under the `dataTemplateEngine` configuration option. Note that `package.json` data is available here under the `pkg` variable.

For example, if your `dataTemplateEngine` is using the default, `liquid`, you can do this:

```
{
  "version": "{{ pkg.version }}"
}
```
