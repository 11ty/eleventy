const lodashchunk = require("lodash.chunk");
const lodashget = require("lodash.get");
const TemplateConfig = require("../TemplateConfig");

let cfg = TemplateConfig.getDefaultConfig();

function Pagination(data) {
  this.data = data || {};
  this.size = 10;
  this.target = [];
  this.writeCount = 0;

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

  let data = this.data;
  let pages = [];
  let items = this.items;
  let tmpl = this.template;
  let templates = [];
  let links = [];
  let overrides = [];

  for (var pageNumber = 0, k = items.length; pageNumber < k; pageNumber++) {
    let chunk = items[pageNumber];
    let cloned = tmpl.clone();
    // TODO maybe also move this permalink additions up into the pagination class
    if (pageNumber > 0 && !this.data[cfg.keys.permalink]) {
      cloned.setExtraOutputSubdirectory(pageNumber);
    }

    cloned.removePlugin("pagination");
    templates.push(cloned);

    // TODO if only one item, maybe name it pagination.item and don’t array it?
    overrides.push({
      pagination: {
        data: this.data.pagination.data,
        size: this.data.pagination.size,
        items: items[pageNumber],
        pageNumber: pageNumber
      }
    });
    cloned.setDataOverrides(overrides[pageNumber]);

    // TO DO subdirectory to links if the site doesn’t live at /
    links.push("/" + (await cloned.getOutputLink()));
  }

  // we loop twice to pass in the appropriate prev/next links (already full generated now)
  templates.forEach(
    function(cloned, pageNumber) {
      overrides[pageNumber].pagination.previousPageLink =
        pageNumber > 0 ? links[pageNumber - 1] : null;
      overrides[pageNumber].pagination.nextPageLink =
        pageNumber < templates.length - 1 ? links[pageNumber + 1] : null;
      overrides[pageNumber].pagination.pageLinks = links;
      cloned.setDataOverrides(overrides[pageNumber]);

      pages.push(cloned);
    }.bind(this)
  );

  return pages;
};

Pagination.prototype.write = async function() {
  let pages = await this.getTemplates();
  for (let page of pages) {
    await page.write();
    this.writeCount += page.getWriteCount();
  }
};

Pagination.prototype.getWriteCount = function() {
  return this.writeCount;
};

module.exports = Pagination;
