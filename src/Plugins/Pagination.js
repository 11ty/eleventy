const lodashChunk = require("lodash/chunk");
const lodashGet = require("lodash/get");
const lodashSet = require("lodash/set");
const EleventyBaseError = require("../EleventyBaseError");
const config = require("../Config");

class PaginationError extends EleventyBaseError {}

class Pagination {
  constructor(data) {
    this.config = config.getConfig();

    this.setData(data);
  }

  static hasPagination(data) {
    return "pagination" in data;
  }

  hasPagination() {
    if (!this.data) {
      throw new Error("Missing `setData` call for Pagination object.");
    }
    return Pagination.hasPagination(this.data);
  }

  circularReferenceCheck(data) {
    if (data.eleventyExcludeFromCollections) {
      return;
    }

    let key = data.pagination.data;
    let tags = data.tags || [];
    for (let tag of tags) {
      if (`collections.${tag}` === key) {
        throw new PaginationError(
          `Pagination circular reference${
            this.template ? ` on ${this.template.inputPath}` : ""
          }, data:\`${key}\` iterates over both the \`${tag}\` tag and also supplies pages to that tag.`
        );
      }
    }
  }

  setData(data) {
    this.data = data || {};
    this.target = [];

    if (!this.hasPagination()) {
      return;
    }

    if (!data.pagination) {
      throw new Error(
        "Misconfigured pagination data in template front matter (YAML front matter precaution: did you use tabs and not spaces for indentation?)."
      );
    } else if (!("size" in data.pagination)) {
      throw new Error("Missing pagination size in front matter data.");
    }
    this.circularReferenceCheck(data);

    this.size = data.pagination.size;
    this.alias = data.pagination.alias;

    this.target = this._resolveItems();
    this.items = this.getPagedItems();
  }

  setTemplate(tmpl) {
    this.template = tmpl;
  }

  _getDataKey() {
    return this.data.pagination.data;
  }

  resolveObjectToValues() {
    if ("resolve" in this.data.pagination) {
      return this.data.pagination.resolve === "values";
    }
    return false;
  }

  isFiltered(value) {
    if ("filter" in this.data.pagination) {
      let filtered = this.data.pagination.filter;
      if (Array.isArray(filtered)) {
        return filtered.indexOf(value) > -1;
      }

      return filtered === value;
    }

    return false;
  }

  _resolveItems() {
    let notFoundValue = "__NOT_FOUND_ERROR__";
    let key = this._getDataKey();
    let ret = lodashGet(this.data, key, notFoundValue);
    if (ret === notFoundValue) {
      throw new Error(
        `Could not resolve pagination key in template data: ${key}`
      );
    }

    if (!Array.isArray(ret)) {
      if (this.resolveObjectToValues()) {
        ret = Object.values(ret);
      } else {
        ret = Object.keys(ret);
      }
    }

    let result = ret.filter(
      function(value) {
        return !this.isFiltered(value);
      }.bind(this)
    );
    if (this.data.pagination.reverse === true) {
      return result.reverse();
    }
    return result;
  }

  getPagedItems() {
    // TODO switch to a getter
    if (!this.data) {
      throw new Error("Missing `setData` call for Pagination object.");
    }

    return lodashChunk(this.target, this.size);
  }

  // TODO this name is not good
  // “To cancel” means to not write the original root template
  cancel() {
    return this.hasPagination();
  }

  getPageCount() {
    if (!this.hasPagination()) {
      return 0;
    }

    return this.items.length;
  }

  async getPageTemplates() {
    if (!this.data) {
      throw new Error("Missing `setData` call for Pagination object.");
    }

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
    let hrefs = [];
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
        lodashSet(
          override,
          this.alias,
          this.size === 1 ? items[pageNumber][0] : items[pageNumber]
        );
      }

      overrides.push(override);
      cloned.setPaginationData(override);

      // TO DO subdirectory to links if the site doesn’t live at /
      links.push("/" + (await cloned.getOutputLink()));
      hrefs.push(await cloned.getOutputHref());
    }

    // we loop twice to pass in the appropriate prev/next links (already full generated now)
    templates.forEach(
      function(cloned, pageNumber) {
        // links
        overrides[pageNumber].pagination.previousPageLink =
          pageNumber > 0 ? links[pageNumber - 1] : null;
        overrides[pageNumber].pagination.previous =
          overrides[pageNumber].pagination.previousPageLink;

        overrides[pageNumber].pagination.nextPageLink =
          pageNumber < templates.length - 1 ? links[pageNumber + 1] : null;
        overrides[pageNumber].pagination.next =
          overrides[pageNumber].pagination.nextPageLink;

        overrides[pageNumber].pagination.firstPageLink =
          links.length > 0 ? links[0] : null;
        overrides[pageNumber].pagination.lastPageLink =
          links.length > 0 ? links[links.length - 1] : null;

        overrides[pageNumber].pagination.links = links;
        // todo deprecated, consistency with collections and use links instead
        overrides[pageNumber].pagination.pageLinks = links;

        // hrefs
        overrides[pageNumber].pagination.previousPageHref =
          pageNumber > 0 ? hrefs[pageNumber - 1] : null;
        overrides[pageNumber].pagination.nextPageHref =
          pageNumber < templates.length - 1 ? hrefs[pageNumber + 1] : null;

        overrides[pageNumber].pagination.firstPageHref =
          hrefs.length > 0 ? hrefs[0] : null;
        overrides[pageNumber].pagination.lastPageHref =
          hrefs.length > 0 ? hrefs[hrefs.length - 1] : null;

        overrides[pageNumber].pagination.hrefs = hrefs;

        cloned.setPaginationData(overrides[pageNumber]);

        pages.push(cloned);
      }.bind(this)
    );

    this.pagesCache = pages;

    return pages;
  }
}

module.exports = Pagination;
