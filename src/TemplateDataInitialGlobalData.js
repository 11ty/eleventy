import semver from "semver";
import { readFile } from "node:fs/promises";
import lodashset from "lodash/set.js";

export default class TemplateDataInitialGlobalData {
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
    const { version } = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8")
    );
    globalData.eleventy.version = semver.coerce(version).toString();
    globalData.eleventy.generator = `Eleventy v${globalData.eleventy.version}`;

    return globalData;
  }
}
