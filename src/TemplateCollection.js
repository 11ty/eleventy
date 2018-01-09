const Sortable = require("./Util/Sortable");

class TemplateCollection extends Sortable {
  constructor() {
    super();
  }

  async addTemplate(template) {
    let templateMap = await template.getMapped();
    super.add(templateMap);
  }

  getAll(activeTemplate) {
    return this.sort(Sortable.sortFunctionDirDateFilename).map(function(
      templateMap
    ) {
      if (activeTemplate) {
        templateMap.active = templateMap.template === activeTemplate;
      }
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
