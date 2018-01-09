# Collections (and Tags)

While [pagination](pagination.md) allows you do iterate over a data set to create multiple templates, a collection allows you to group content in interesting ways. A piece of content can be a part of multiple collections, merely by assigning the same string value to the `tags` key in the front matter.

## A Blog Example

For a blog site, your individual post files may use a tag called `post`, but it can be whatever you want. In this example, `mypost.md` has a single tag `post`:

```
---
tags: post
title: Hot Take—Social Media is Considered Harmful
---
```

This will place this `mypost.md` into the `post` collection with all other pieces of content sharing the `post` tag. To reference this collection and make a list of all posts, use the `collections` object in any template (this example is using Nunjucks syntax):

```
<ul>
{%- for post in collections.post -%}
  <li>{{ post.data.title }}</li>
{%- endfor -%}
</ul>
```

## Tag Syntax

You can use a single tag, as in the above example OR you can use any number of tags for the content, using YAML syntax for a list.

### A single tag, cat

```
---
tags: cat
---
```

This content would show up in the template data inside of `collections.cat`.

### Multiple tags, single line

```
---
tags: ['cat', 'dog']
---
```

This content would show up in the template data inside of `collections.cat` and `collections.dog`.

### Multiple tags, multiple lines

```
---
tags:
  - cat
  - dog
---
```

This content would show up in the template data inside of `collections.cat` and `collections.dog`.

## Sorting

The default collection sorting algorithm sorts in ascending order using:

1. The input file’s Created Date (you can override using `date` in front matter, as shown below)
2. Files created at the exact same time are tiebroken using the input file’s full path including filename

For example, assume I only write blog posts on New Years Day:

```
posts/postA.md (created on 2008-01-01)
posts/postB.md (created on 2008-01-01)
posts/post3.md (created on 2007-01-01)
another-posts/post1.md (created on 2011-01-01)
```

This collection would be sorted like this:

1. `posts/post3.md`
2. `posts/postA.md`
3. `posts/postB.md`
4. `another-posts/post1.md`

### Sort descending

To sort descending in your template, just use `Array.reverse()`. For example, in Nunjucks it’d look like this:

```
<ul>
{%- for post in collections.post.reverse() -%}
  <li>{{ post.data.title }}</li>
{%- endfor -%}
</ul>
```

### Overriding Content Dates

Add a `date` key to your front matter to override the default date (file creation) and customize how the file is sorted in a collection.

```
---
date: 2016-01-01
---
```

Valid `date` values:

* `Last Modified`: automatically resolves to the file’s last modified date
* `Created`: automatically resolves to the file’s created date (default, this is what is used when `date` is omitted).
* `2016-01-01` or any other valid YAML date value
* `"2016-01-01"` or any other valid UTC **string** that [Luxon’s `DateTime.fromISO`](https://moment.github.io/luxon/docs/manual/parsing.html#parsing-technical-formats) can parse (see also the [Luxon API docs](https://moment.github.io/luxon/docs/class/src/datetime.js~DateTime.html#static-method-fromISO)).

## Advanced: Custom Filtering and Sorting

To get fancier with your collections (and even do a bit of your own custom filtering, if you’d like), you can use our Configuration API.

Inside of your `.eleventy.js` config file, use the first argument to the config function (`config` below) to call the API (note that module exports is a function and not an object literal):

```
module.exports = function(config) {
  // API is available in `config` argument

  return {
    // your normal config options
    markdownTemplateEngine: "njk"
  }
};
```

You can use `config` (or whatever you name it) like so:

```
config.addCollection("myCollectionName", function(collection) {
  // get unsorted items
  return collection.getAll();
});
```

The data collection gets passed to the callback. You can use it in all sorts of ways:

```
// Unsorted items (in whatever order they were added)
return collection.getAll();

// Use the default sorting algorithm (ascending dir, date, filename)
return collection.getAllSorted();

// Use the default sorting algorithm in reverse (descending dir, date, filename)
return collection.getAllSorted().reverse();

// Get only content that matches a tag
return collection.getFilteredByTag("post");

// Filter using `Array.filter`
return collection.getAll().filter(function(item) {
  // Side-step tags and do your own filtering
  return "myCustomDataKey" in item.data;
});

// Filter using `Array.filter`
return collection.getAll().filter(function(item) {
  // Only return content that was originally a markdown file
  let extension = item.inputPath.split('.').pop();
  return extension === "md";
});

// Sort with `Array.sort`
return collection.getAll().sort(function(a, b) {
  return b.date - a.date;
});
```

### Individual collection items (useful for sort callbacks)

See how the `Array.sort` function above uses `a.date` and `b.date`? Similarly, any of the following items can be used for sorting and filtering the content.

* `inputPath`: the path to the source input file
* `outputPath`: the path to the output file to be written for this content
* `url`: actual url used to link to the content on the site
* `data`: all data for this content
* `date`: the resolved date used for sorting

```
{ inputPath: './test1.md',
  outputPath: './_site/test1/index.html',
  url: 'test1/index.html',
  data: { title: 'Test Title', tags: ['tag1', 'tag2'], date: 'Last Modified' },
  date: 2018-01-09T04:10:17.000Z }
```
