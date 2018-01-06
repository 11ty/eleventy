const globby = require("globby");
const parsePath = require("parse-filepath");
const Template = require("./Template");
const Path = require("./TemplatePath");
const Sortable = require("./Util/Sortable");

class TemplateCollection extends Sortable {
  constructor() {
    super();
  }

  async addTemplate(template) {
    let templateMap = await template.getMapped();
    super.add(templateMap);
  }

  getTemplatePathIndex(template) {
    if (!template) {
      return -1;
    }

    return this.items.indexOf(template);
  }

  getSortedByInputPath() {
    return this.sort(function(mapA, mapB) {
      return Sortable.sortAlphabeticAscending(mapA.inputPath, mapB.inputPath);
    });
  }

  getAll(activeTemplate) {
    return this.getSortedByInputPath().map(function(templateMap) {
      templateMap.active =
        activeTemplate && templateMap.template === activeTemplate;
      return templateMap;
    });
  }

  getFiltered(callback) {
    return this.getAll().filter(callback);
  }

  getFilteredByTag(tagName, activeTemplate) {
    return this.getAll(activeTemplate).filter(function(item) {
      return (
        !tagName ||
        ((Array.isArray(item.data.tags) ||
          typeof item.data.tags === "string") &&
          item.data.tags.indexOf(tagName) > -1)
      );
    });
  }
}
module.exports = TemplateCollection;
