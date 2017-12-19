# Pagination

To iterate over a data set and create pages for individual chunks of data, use pagination. Enable in your template’s front matter by adding the `pagination` key. Consider this Nunjucks template:

```
---
pagination:
  data: testdata
  size: 2
testdata:
 - item1
 - item2
 - item3
 - item4
---
<ol>{% for item in pagination.items %}<li>{{ item }}</li>{% endfor %}</ol>
```

We enable pagination and then give it a dataset with the `data` key. We (optionally) control the number of items in each chunk with `size`. If left off, the default size is 10. The pagination data variable will be populated with what you need to create each template. Here’s what’s in `pagination`:

```
{
  items: [], // current page’s chunk of data
  pageNumber: 0, // current page number, 0 indexed
  nextPageLink: "", // put inside <a href="{{ pagination.nextPageLink }}">Next Page</a>
  previousPageLink: "", // put inside <a href="{{ pagination.previousPageLink }}">Previous Page</a>
  pageLinks: [], // all page links
  data: "", // pointer to dataset
  size: 10, // chunk sizes
}
```

If the above file were named `paged.njk`, it would create two pages: `_site/paged/0/index.html` and `_site/paged/1/index.html`.

## Remapping with permalinks

Pagination variables also work here. Here’s an example of a permalink using the pagination page number:

```
---
permalink: paged/page-{{ pagination.pageNumber }}/index.html
---
```

Writes to `_site/paged/page-0/index.html`, `_site/paged/page-1/index.html`, et cetera.

That means Nunjucks will also let you start your page numbers with 1 instead of 0, by just adding 1 here:

```
---
permalink: paged/page-{{ pagination.pageNumber + 1 }}/index.html
---
```

Writes to `_site/paged/page-1/index.html`, `_site/paged/page-2/index.html`, et cetera.

## Paginate a global or local data file

[Read more about Template Data Files](data.md). The only change here is that you point your `data` pagination key to the global or local data instead of data in the front matter. For example, consider the following `globalDataSet.json` file in your global data directory.

```
{
  myData: [
    "item1",
    "item2",
    "item3",
    "item4"
  ]
}
```

Your front matter would look like this:

```
---
pagination:
  data: globalDataSet.myData
---
<ol>{% for item in pagination.items %}<li>{{ item }}</li>{% endfor %}</ol>
```
