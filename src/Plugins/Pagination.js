const chunk = require("lodash.chunk");

function Pagination(data) {
  this.data = data;
  this.defaultSize = 10;
}

Pagination.prototype.setTemplate = function(tmpl) {
  this.template = tmpl;
};

Pagination.prototype._getItems = function() {
  // todo targets that are children of arrays: [] not just .
  let keys = this.data.pagination.data.split(".");
  let target = this.data;

  keys.forEach(function(key) {
    target = target[key];
  });

  return target;
};

Pagination.prototype._getSize = function() {
  return this.data.pagination.size || this.defaultSize;
};

Pagination.prototype.cancel = function() {
  return "pagination" in this.data;
};

Pagination.prototype.getPageTemplates = async function() {
  let pages = [];

  if (this.data.pagination) {
    let items = chunk(this._getItems(), this._getSize());
    let tmpl = this.template;

    items.forEach(
      function(chunk, pageNumber) {
        let cloned = tmpl.clone();
        cloned.setExtraOutputSubdirectory(pageNumber);
        cloned.removePlugin("pagination");

        cloned.setDataOverrides({
          pagination: {
            data: this.data.pagination.data,
            size: this.data.pagination.size,
            items: chunk,
            pageNumber: pageNumber
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
