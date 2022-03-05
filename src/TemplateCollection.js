const multimatch = require("multimatch");
const Sortable = require("./Util/Sortable");
const { TemplatePath } = require("@11ty/eleventy-utils");

class TemplateCollection extends Sortable {
  constructor() {
    super();

    this._filteredByGlobsCache = new Map();
  }

  // TODO move this into tests (this is only used by tests)
  async _testAddTemplate(template) {
    let data = await template.getData();
    for (let map of await template.getTemplates(data)) {
      this.add(map);
    }
  }

  getAll() {
    return this.items.slice();
  }

  getAllSorted() {
    return this.sort(Sortable.sortFunctionDateInputPath);
  }

  getSortedByDate() {
    return this.sort(Sortable.sortFunctionDate);
  }

  getGlobs(globs) {
    if (typeof globs === "string") {
      globs = [globs];
    }

    globs = globs.map((glob) => TemplatePath.addLeadingDotSlash(glob));

    return globs;
  }

  getFilteredByGlob(globs) {
    globs = this.getGlobs(globs);

    let key = globs.join("::");
    if (!this._dirty) {
      // Try to find a pre-sorted list and clone it.
      if (this._filteredByGlobsCache.has(key)) {
        return [...this._filteredByGlobsCache.get(key)];
      }
    } else if (this._filteredByGlobsCache.size) {
      // Blow away cache
      this._filteredByGlobsCache = new Map();
    }

    let filtered = this.getAllSorted().filter((item) => {
      if (multimatch([item.inputPath], globs).length) {
        return true;
      }

      return false;
    });
    this._dirty = false;
    this._filteredByGlobsCache.set(key, [...filtered]);
    return filtered;
  }

  getFilteredByTag(tagName) {
    return this.getAllSorted().filter((item) => {
      if (!tagName) {
        return true;
      } else if (Array.isArray(item.data.tags)) {
        return item.data.tags.some((tag) => tag === tagName);
      }
      return false;
    });
  }

  getFilteredByTags(...tags) {
    return this.getAllSorted().filter((item) =>
      tags.every((requiredTag) => {
        const itemTags = item.data.tags;
        if (Array.isArray(itemTags)) {
          return itemTags.includes(requiredTag);
        } else {
          return itemTags === requiredTag;
        }
      })
    );
  }
}

module.exports = TemplateCollection;
