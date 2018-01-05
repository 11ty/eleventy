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

  getFiltered(callback) {
    return this.getSortedByInputPath().filter(callback);
  }

  getFilteredByTag(tagName, activeTemplate) {
    return this.getSortedByInputPath()
      .filter(function(item) {
        return (
          !tagName ||
          (Array.isArray(item.data.tags) &&
            item.data.tags.indexOf(tagName) > -1)
        );
      })
      .map(function(templateMap) {
        templateMap.active =
          activeTemplate && templateMap.template === activeTemplate;
        return templateMap;
      });
  }
}
module.exports = TemplateCollection;
