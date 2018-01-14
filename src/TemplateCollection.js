const Sortable = require("./Util/Sortable");

class TemplateCollection extends Sortable {
  constructor() {
    super();
  }

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
