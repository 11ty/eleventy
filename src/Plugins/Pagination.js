const lodashchunk = require("lodash.chunk");
const lodashget = require("lodash.get");

function Pagination(data) {
  this.data = data || {};
  this.size = 10;
  this.target = [];

  if (!this.hasPagination()) {
    return;
  }

  if (data.pagination.size) {
    this.size = data.pagination.size;
  }

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
  let ret = lodashget(this.data, this._getDataKey(), notFoundValue);

  if (ret === notFoundValue) {
    throw new Error(
      `Could not resolve pagination key in template data: ${this._getDataKey()}`
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

Pagination.prototype.getTemplates = async function() {
  if (!this.hasPagination()) {
    return [];
  }

  let pages = [];
  let items = this.items;
  let tmpl = this.template;
  let templates = [];
  let links = [];

  items.forEach(function(chunk, pageNumber) {
    let cloned = tmpl.clone();
    // TODO make permalinks work better? We want to be able to iterate over a data set and generate
    // templates for all things without having numeric keys in urls
    // Read: fonts/noto-sans instead of fonts/2
    // maybe also move this permalink additions up into the pagination class
    if (pageNumber > 0) {
      cloned.setExtraOutputSubdirectory(pageNumber);
    }
    cloned.removePlugin("pagination");
    templates.push(cloned);
    // TO DO subdirectory to links if the site doesn’t live at /
    links.push("/" + cloned.getOutputLink());
  });

  // we loop twice to pass in the appropriate prev/next links (already full generated now)
  templates.forEach(
    function(cloned, pageNumber) {
      cloned.setDataOverrides({
        pagination: {
          data: this.data.pagination.data,
          size: this.data.pagination.size,
          items: items[pageNumber],
          pageNumber: pageNumber,
          previousPageLink: pageNumber > 0 ? links[pageNumber - 1] : null,
          nextPageLink:
            pageNumber < templates.length - 1 ? links[pageNumber + 1] : null,
          pageLinks: links
        }
      });

      pages.push(cloned);
    }.bind(this)
  );

  return pages;
};

Pagination.prototype.write = async function() {
  let pages = await this.getTemplates();
  pages.forEach(async function(pageTmpl) {
    await pageTmpl.write();
  });
};

module.exports = Pagination;
