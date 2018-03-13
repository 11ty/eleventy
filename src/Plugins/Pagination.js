const lodashchunk = require("lodash.chunk");
const lodashget = require("lodash.get");
const lodashset = require("lodash.set");
const config = require("../Config");

function Pagination(data) {
  this.config = config.getConfig();

  this.data = data || {};
  this.size = 1;
  this.target = [];

  if (!this.hasPagination()) {
    return;
  }

  if (!data.pagination) {
    throw new Error(
      "Misconfigured pagination data in template front matter (did you use tabs and not spaces?)."
    );
  } else if (!("size" in data.pagination)) {
    throw new Error("Missing pagination size in front matter data.");
  }

  this.size = data.pagination.size;
  this.alias = data.pagination.alias;

  this.target = this._resolveItems(data);
  this.items = this.getPagedItems();
}

Pagination.prototype.hasPagination = function() {
  return "pagination" in this.data;
};

Pagination.prototype.setTemplate = function(tmpl) {
  this.template = tmpl;
};

Pagination.prototype._getDataKey = function() {
  return this.data.pagination.data;
};

Pagination.prototype._resolveItems = function() {
  let notFoundValue = "__NOT_FOUND_ERROR__";
  let key = this._getDataKey();
  let ret = lodashget(this.data, key, notFoundValue);

  if (ret === notFoundValue) {
    throw new Error(
      `Could not resolve pagination key in template data: ${key}`
    );
  }

  return ret;
};

Pagination.prototype.getPagedItems = function() {
  return lodashchunk(this.target, this.size);
};

// TODO this name is not good
// don’t write the original root template
Pagination.prototype.cancel = function() {
  return this.hasPagination();
};

Pagination.prototype.getPageTemplates = async function() {
  if (!this.hasPagination()) {
    return [];
  }

  if (this.pagesCache) {
    return this.pagesCache;
  }

  let pages = [];
  let items = this.items;
  let tmpl = this.template;
  let templates = [];
  let links = [];
  let overrides = [];

  for (let pageNumber = 0, k = items.length; pageNumber < k; pageNumber++) {
    let cloned = tmpl.clone();

    // TODO maybe also move this permalink additions up into the pagination class
    if (pageNumber > 0 && !this.data[this.config.keys.permalink]) {
      cloned.setExtraOutputSubdirectory(pageNumber);
    }

    templates.push(cloned);

    let override = {
      pagination: {
        data: this.data.pagination.data,
        size: this.data.pagination.size,
        items: items[pageNumber],
        pageNumber: pageNumber
      }
    };

    if (this.alias) {
      lodashset(
        override,
        this.alias,
        this.size === 1 ? items[pageNumber][0] : items[pageNumber]
      );
    }

    overrides.push(override);
    cloned.setDataOverrides(overrides[pageNumber]);

    // TO DO subdirectory to links if the site doesn’t live at /
    links.push("/" + (await cloned.getOutputLink()));
  }

  // we loop twice to pass in the appropriate prev/next links (already full generated now)
  templates.forEach(
    function(cloned, pageNumber) {
      overrides[pageNumber].pagination.previousPageLink =
        pageNumber > 0 ? links[pageNumber - 1] : null;
      overrides[pageNumber].pagination.previous =
        overrides[pageNumber].pagination.previousPageLink;

      overrides[pageNumber].pagination.nextPageLink =
        pageNumber < templates.length - 1 ? links[pageNumber + 1] : null;
      overrides[pageNumber].pagination.next =
        overrides[pageNumber].pagination.nextPageLink;

      overrides[pageNumber].pagination.links = links;
      // todo deprecated, consistency with collections and use links instead
      overrides[pageNumber].pagination.pageLinks = links;

      cloned.setDataOverrides(overrides[pageNumber]);

      pages.push(cloned);
    }.bind(this)
  );

  this.pagesCache = pages;

  return pages;
};

module.exports = Pagination;
