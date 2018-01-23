# Data Files

All data files will be pre-processed with the template engine specified under the `dataTemplateEngine` configuration option. Note that `package.json` data is available here under the `pkg` variable.

For example, if your `dataTemplateEngine` is using the default, `liquid`, you can do this:

```
{
  "version": "{{ pkg.version }}"
}
```

## Global Template Data

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

## Local Template Data

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
