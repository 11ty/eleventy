const multimatch = require("multimatch");
const Sortable = require("./Util/Sortable");
const TemplatePath = require("./TemplatePath");

class TemplateCollection extends Sortable {
  // right now this is only used by the tests
  async _testAddTemplate(template) {
    let data = await template.getData();
    for (let map of await template.getTemplates(data)) {
      this.add(map);
    }
  }

  getAll() {
    return this.items.filter(() => true);
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

    globs = globs.map(glob => TemplatePath.addLeadingDotSlash(glob));

    return globs;
  }

  getFilteredByGlob(globs) {
    globs = this.getGlobs(globs);

    return this.getAllSorted().filter(item => {
      if (multimatch([item.inputPath], globs).length) {
        return true;
      }

      return false;
    });
  }

  getFilteredByTag(tagName) {
    return this.getAllSorted().filter(item => {
      if (!tagName) {
        return true;
      } else if (Array.isArray(item.data.tags)) {
        return item.data.tags.some(tag => tag === tagName);
      }
      return false;
    });
  }

  getFilteredByTags(...tags) {
    return this.getAllSorted().filter(item =>
      tags.every(requiredTag => {
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
