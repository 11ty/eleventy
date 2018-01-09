const Sortable = require("./Util/Sortable");

class TemplateCollection extends Sortable {
  constructor() {
    super();
  }

  async addTemplate(template) {
    let templateMap = await template.getMapped();
    super.add(templateMap);
  }

  _assignActiveTemplate(items, activeTemplate) {
    if (activeTemplate) {
      return items.map(function(templateMap) {
        templateMap.active = templateMap.template === activeTemplate;
        return templateMap;
      });
    } else {
      return items;
    }
  }

  getAll() {
    return this.items;
  }

  getAllSorted(activeTemplate) {
    return this._assignActiveTemplate(
      this.sort(Sortable.sortFunctionDirDateFilename),
      activeTemplate
    );
  }

  getFilteredByTag(tagName, activeTemplate) {
    return this.getAllSorted(activeTemplate).filter(function(item) {
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
