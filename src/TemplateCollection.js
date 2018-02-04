const multimatch = require("multimatch");
const Sortable = require("./Util/Sortable");
const TemplatePath = require("./TemplatePath");

class TemplateCollection extends Sortable {
  constructor() {
    super();
  }

  // right now this is only used by the tests
  async addTemplate(template) {
    let templateMap = await template.getMapped();
    super.add(templateMap);
  }

  getAll() {
    return this.items;
  }

  getAllSorted() {
    return this.sort(Sortable.sortFunctionDateInputPath);
  }

  getSortedByDate() {
    return this.sort(Sortable.sortFunctionDate);
  }

  getFilteredByGlob(globs) {
    if (typeof globs === "string") {
      globs = [globs];
    }

    globs = globs.map(glob => TemplatePath.addLeadingDotSlash(glob));

    return this.getAllSorted().filter(item => {
      if (multimatch([item.inputPath], globs).length) {
        return true;
      }

      return false;
    });
  }

  getFilteredByTag(tagName) {
    return this.getAllSorted().filter(function(item) {
      if (!tagName) {
        return true;
      } else if (
        Array.isArray(item.data.tags) ||
        typeof item.data.tags === "string"
      ) {
        return item.data.tags.indexOf(tagName) > -1;
      }
      return false;
    });
  }
}
module.exports = TemplateCollection;
