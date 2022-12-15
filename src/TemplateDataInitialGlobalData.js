const pkg = require("../package.json");
const semver = require("semver");
const lodashset = require("lodash.set");

class TemplateDataInitialGlobalData {
  constructor(templateConfig) {
    if (!templateConfig) {
      throw new TemplateDataConfigError("Missing `config`.");
    }
    this.templateConfig = templateConfig;
    this.config = this.templateConfig.getConfig();
  }

  async getData() {
    let globalData = {};

    // via eleventyConfig.addGlobalData
    if (this.config.globalData) {
      let keys = Object.keys(this.config.globalData);
      for (let key of keys) {
        let returnValue = this.config.globalData[key];

        if (typeof returnValue === "function") {
          returnValue = await returnValue();
        }

        lodashset(globalData, key, returnValue);
      }
    }

    if (!("eleventy" in globalData)) {
      globalData.eleventy = {};
    }
    // #2293 for meta[name=generator]
    globalData.eleventy.version = semver.coerce(pkg.version).toString();
    globalData.eleventy.generator = `Eleventy v${globalData.eleventy.version}`;

    return globalData;
  }
}

module.exports = TemplateDataInitialGlobalData;
