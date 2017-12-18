const chunk = require("lodash.chunk");

function Pagination(data) {
  this.data = data;
  this.defaultSize = 10;
}

Pagination.prototype.setTemplate = function(tmpl) {
  this.template = tmpl;
};

Pagination.prototype._resolveItems = function() {
  // todo targets that are children of arrays: [] not just .
  let keys = this.data.pagination.data.split(".");
  let target = this.data;

  keys.forEach(function(key) {
    target = target[key];
  });

  return target;
};

Pagination.prototype._getItems = function() {
  return chunk(this._resolveItems(), this._getSize());
};

Pagination.prototype._getSize = function() {
  return this.data.pagination.size || this.defaultSize;
};

// don’t write the original root template
Pagination.prototype.cancel = function() {
  return "pagination" in this.data;
};

Pagination.prototype.getPageTemplates = async function() {
  let pages = [];

  if (this.data.pagination) {
    let items = this._getItems();
    let tmpl = this.template;
    let templates = [];
    let links = [];

    items.forEach(function(chunk, pageNumber) {
      let cloned = tmpl.clone();
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
  }

  return pages;
};

Pagination.prototype.write = async function() {
  let pages = await this.getPageTemplates();
  pages.forEach(async function(pageTmpl) {
    await pageTmpl.write();
  });
};

module.exports = Pagination;
