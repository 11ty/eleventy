const lodashChunk = require("lodash/chunk");
const lodashGet = require("lodash/get");
const lodashSet = require("lodash/set");
const EleventyBaseError = require("../EleventyBaseError");
const config = require("../Config");

class PaginationError extends EleventyBaseError {}

class PaginationGroup {
  constructor(options) {
    if (!("size" in options)) {
      throw new Error("Missing pagination size in front matter data.");
    }
    this.size = options.size;
    this.alias = options.alias;
    this.before = options.before;
    this.reverse = options.reverse;
    this.filter = options.filter;
    this.resolve = options.resolve;
    this.data = options.data;
    this.target = null;
    this.items = null;
  }

  _getDataKey() {
    return this.data;
  }

  resolveItems(data) {
    this.target = this._resolveItems(data);
    this.items = this.pageItems(this.target);
  }

  isFiltered(value) {
    if (this.filter) {
      let filtered = this.filter;
      if (Array.isArray(filtered)) {
        return filtered.indexOf(value) > -1;
      }

      return filtered === value;
    }

    return false;
  }

  circularReferenceCheck(data, template) {
    if (data.eleventyExcludeFromCollections) {
      return;
    }

    let key = this.data;
    let tags = data.tags || [];
    for (let tag of tags) {
      if (`collections.${tag}` === key) {
        throw new PaginationError(
          `Pagination circular reference${
            template ? ` on ${template.inputPath}` : ""
          }, data:\`${key}\` iterates over both the \`${tag}\` tag and also supplies pages to that tag.`
        );
      }
    }
  }

  doResolveToObjectValues() {
    if (this.resolve) {
      return this.resolve === "values";
    }
    return false;
  }

  _resolveItems(data) {
    let notFoundValue = "__NOT_FOUND_ERROR__";
    let key = this._getDataKey();
    let fullDataSet = lodashGet(data, key, notFoundValue);
    if (fullDataSet === notFoundValue) {
      throw new Error(
        `Could not resolve pagination key in template data: ${key}`
      );
    }

    let keys;
    if (Array.isArray(fullDataSet)) {
      keys = fullDataSet;
    } else if (this.doResolveToObjectValues()) {
      keys = Object.values(fullDataSet);
    } else {
      keys = Object.keys(fullDataSet);
    }

    let result = keys.slice();

    if (this.before && typeof this.before === "function") {
      // we don’t need to make a copy of this because we already .filter() above
      result = this.before(result);
    }

    if (this.reverse === true) {
      result = result.reverse();
    }

    if (this.filter) {
      result = result.filter((value) => !this.isFiltered(value));
    }

    return result;
  }

  pageItems(data) {
    return lodashChunk(data, this.size);
  }

  getPaginationData(prevPaginationData) {
    const items = this.items;
    if (!items) {
      throw new Error(
        `Cannot get pagination data before items have been resolved.`
      );
    }
    return this.items.map((item, pageNumber, items) => {
      const pagination = {
        data: this.data,
        size: this.size,
        alias: this.alias,

        pages: this.size === 1 ? items.map((entry) => entry[0]) : items,

        // See Issue #345 for more examples
        page: {
          previous:
            pageNumber > 0
              ? this.size === 1
                ? items[pageNumber - 1][0]
                : items[pageNumber - 1]
              : null,
          next:
            pageNumber < items.length - 1
              ? this.size === 1
                ? items[pageNumber + 1][0]
                : items[pageNumber + 1]
              : null,
          first: items.length
            ? this.size === 1
              ? items[0][0]
              : items[0]
            : null,
          last: items.length
            ? this.size === 1
              ? items[items.length - 1][0]
              : items[items.length - 1]
            : null,
        },

        items: items[pageNumber],
        pageNumber,
      };
      const obj = {
        ...prevPaginationData,
        pagination: prevPaginationData
          ? [...[].concat(prevPaginationData.pagination), pagination]
          : pagination,
      };

      if (this.alias) {
        lodashSet(
          obj,
          this.alias,
          this.size === 1 ? items[pageNumber][0] : items[pageNumber]
        );
      }

      return obj;
    });
  }
}

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

  setData(data) {
    this.data = data || {};

    if (!this.hasPagination()) {
      return;
    }

    if (!data.pagination) {
      throw new Error(
        "Misconfigured pagination data in template front matter (YAML front matter precaution: did you use tabs and not spaces for indentation?)."
      );
    }

    this.dataPaginationGroups = Array.isArray(data.pagination)
      ? data.pagination.map((item) => new PaginationGroup(item))
      : [new PaginationGroup(data.pagination)];

    this.dataPaginationGroups.forEach((group) => {
      group.circularReferenceCheck(this.data, this.template);
      group.resolveItems(this.data);
    });
  }

  get pagedItems() {
    return this.dataPaginationGroups
      ? this.dataPaginationGroups.length === 1
        ? this.dataPaginationGroups[0].items
        : this.dataPaginationGroups.map((group) => group.items)
      : [];
  }

  _resolveItems() {
    return this.dataPaginationGroups
      ? this.dataPaginationGroups.length === 1
        ? this.dataPaginationGroups[0].target
        : this.dataPaginationGroups.map((group) => group.target)
      : [];
  }

  setTemplate(tmpl) {
    this.template = tmpl;
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

    return this.dataPaginationGroups.reduce(
      (acc, curr) => acc * curr.items.length,
      1
    );
  }

  async getPageTemplates() {
    if (!this.data) {
      throw new Error("Missing `setData` call for Pagination object.");
    }

    if (!this.hasPagination()) {
      return [];
    }

    return (
      this.pagesCache ||
      (this.pagesCache = (
        await Promise.all(
          this.dataPaginationGroups
            .reduce((overrides, group) => {
              return !overrides
                ? group.getPaginationData()
                : overrides.flatMap((pageData) =>
                    group.getPaginationData(pageData)
                  );
            }, null)
            .map(async (data, ii) => {
              // const pageNumber = pageData.pagination.pageNumber; //wont work
              let clonedTemplate = this.template.clone();

              // TODO maybe also move this permalink additions up into the pagination class
              if (ii > 0 && !this.data[this.config.keys.permalink]) {
                clonedTemplate.setExtraOutputSubdirectory(ii);
              }

              clonedTemplate.setPaginationData(data);

              // TO DO subdirectory to links if the site doesn’t live at /
              var [outputLink, outputHref] = await Promise.all([
                clonedTemplate.getOutputLink(),
                clonedTemplate.getOutputHref(),
              ]);

              return {
                outputLink: "/" + outputLink,
                outputHref,
                clonedTemplate,
                data,
              };
            })
        )
      ).map(({ clonedTemplate, outputHref, outputLink, data }, i, pages) => {
        function fixupPagination(pagination, paginationGroup = 0) {
          const pageNumber = pagination.pageNumber;
          const pagesInGroup = pages
            .filter((page) => {
              return Array.isArray(page.data.pagination)
                ? page.data.pagination.every(
                    (otherPaginationItem, index) =>
                      index === paginationGroup ||
                      data.pagination[index].pageNumber ===
                        otherPaginationItem.pageNumber
                  )
                : true;
            })
            .sort((a, b) => {
              return Array.isArray(data.pagination)
                ? a.data.pagination[paginationGroup].pageNumber -
                    b.data.pagination[paginationGroup].pageNumber
                : 0;
            });
          const links = pagesInGroup.map((item) => item.outputLink);
          const hrefs = pagesInGroup.map((item) => item.outputHref);
          let pageObj = {};

          // links are okay but hrefs are better
          pageObj.previous = pageObj.previousPageLink =
            pageNumber > 0 ? links[pageNumber - 1] : null;

          pageObj.next = pageObj.nextPageLink =
            pageNumber < pages.length - 1 ? links[pageNumber + 1] : null;

          pageObj.firstPageLink = links.length > 0 ? links[0] : null;
          pageObj.lastPageLink =
            links.length > 0 ? links[links.length - 1] : null;

          // todo pageLinks is deprecated, consistency with collections and use links instead
          pageObj.pageLinks = pageObj.links = links;

          // hrefs are better than links
          pageObj.previousPageHref =
            pageNumber > 0 ? hrefs[pageNumber - 1] : null;
          pageObj.nextPageHref =
            pageNumber < pages.length - 1 ? hrefs[pageNumber + 1] : null;

          pageObj.firstPageHref = hrefs.length > 0 ? hrefs[0] : null;
          pageObj.lastPageHref =
            hrefs.length > 0 ? hrefs[hrefs.length - 1] : null;

          pageObj.hrefs = hrefs;

          // better names
          pageObj.href = {
            previous: pageObj.previousPageHref,
            next: pageObj.nextPageHref,
            first: pageObj.firstPageHref,
            last: pageObj.lastPageHref,
          };

          return Object.assign({}, pagination, pageObj);
        }

        if (Array.isArray(data.pagination)) {
          data.pagination = data.pagination.map((item, index) =>
            fixupPagination(item, index)
          );
        } else {
          data.pagination = fixupPagination(data.pagination);
        }

        clonedTemplate.setPaginationData(data);

        return clonedTemplate;
      }))
    );
  }
}

module.exports = Pagination;
