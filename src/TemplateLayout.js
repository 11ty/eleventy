const TemplateLayoutPathResolver = require("./TemplateLayoutPathResolver");
const TemplateContent = require("./TemplateContent");
const TemplateData = require("./TemplateData");
const TemplatePath = require("./TemplatePath");

const templateCache = require("./TemplateCache");
// const debug = require("debug")("Eleventy:TemplateLayout");
const debugDev = require("debug")("Dev:Eleventy:TemplateLayout");

class TemplateLayout extends TemplateContent {
  constructor(key, inputDir, extensionMap, config) {
    if (!config) {
      throw new Error("Expected `config` in TemplateLayout constructor.");
    }

    let resolvedPath = new TemplateLayoutPathResolver(
      key,
      inputDir,
      extensionMap,
      config
    ).getFullPath();

    super(resolvedPath, inputDir, config);

    if (!extensionMap) {
      throw new Error("Expected `extensionMap` in TemplateLayout constructor.");
    }
    this.extensionMap = extensionMap;
    this.dataKeyLayoutPath = key;
    this.inputPath = resolvedPath;
    this.inputDir = inputDir;
  }

  static resolveFullKey(key, inputDir) {
    return TemplatePath.join(inputDir, key);
  }

  static getTemplate(key, inputDir, config, extensionMap) {
    if (config.useTemplateCache) {
      let fullKey = TemplateLayout.resolveFullKey(key, inputDir);
      if (templateCache.has(fullKey)) {
        debugDev("Found %o in TemplateCache", key);
        return templateCache.get(fullKey);
      }

      let tmpl = new TemplateLayout(key, inputDir, extensionMap, config);
      debugDev("Added %o to TemplateCache", key);
      templateCache.add(fullKey, tmpl);

      return tmpl;
    } else {
      return new TemplateLayout(key, inputDir, extensionMap, config);
    }
  }

  async getTemplateLayoutMapEntry() {
    return {
      key: this.dataKeyLayoutPath,
      inputDir: this.inputDir,
      template: this,
      frontMatterData: await this.getFrontMatterData(),
    };
  }

  async getTemplateLayoutMap() {
    if (this.mapCache) {
      return this.mapCache;
    }

    let cfgKey = this.config.keys.layout;
    let map = [];
    let mapEntry = await this.getTemplateLayoutMapEntry();
    map.push(mapEntry);

    while (mapEntry.frontMatterData && cfgKey in mapEntry.frontMatterData) {
      let layout = TemplateLayout.getTemplate(
        mapEntry.frontMatterData[cfgKey],
        mapEntry.inputDir,
        this.config,
        this.extensionMap
      );
      mapEntry = await layout.getTemplateLayoutMapEntry();
      map.push(mapEntry);
    }

    this.mapCache = map;
    return map;
  }

  async getData() {
    if (this.dataCache) {
      return this.dataCache;
    }

    let map = await this.getTemplateLayoutMap();
    let dataToMerge = [];
    let layoutChain = [];
    for (let j = map.length - 1; j >= 0; j--) {
      layoutChain.push(map[j].template.inputPath);
      dataToMerge.push(map[j].frontMatterData);
    }

    // Deep merge of layout front matter
    let data = TemplateData.mergeDeep(this.config, {}, ...dataToMerge);
    delete data[this.config.keys.layout];

    this.layoutChain = layoutChain.reverse();
    this.dataCache = data;
    return data;
  }

  async _testGetLayoutChain() {
    if (!this.layoutChain) {
      await this.getData();
    }
    return this.layoutChain;
  }

  async getCompiledLayoutFunctions(layoutMap) {
    let fns = [];
    try {
      for (let layoutEntry of layoutMap) {
        fns.push(
          await layoutEntry.template.compile(
            await layoutEntry.template.getPreRender()
          )
        );
      }
    } catch (e) {
      debugDev("Clearing TemplateCache after error.");
      templateCache.clear();
      return Promise.reject(e);
    }

    return fns;
  }

  static augmentDataWithContent(data, templateContent) {
    data = data || {};

    if (templateContent !== undefined) {
      data.content = templateContent;
      data.layoutContent = templateContent;

      // deprecated
      data._layoutContent = templateContent;
    }

    return data;
  }

  // Inefficient? We want to compile all the templatelayouts into a single reusable callback?
  // Trouble: layouts may need data variables present downstream/upstream
  async render(data, templateContent) {
    data = TemplateLayout.augmentDataWithContent(data, templateContent);

    let layoutMap = await this.getTemplateLayoutMap();
    let fns = await this.getCompiledLayoutFunctions(layoutMap);
    for (let fn of fns) {
      templateContent = await fn(data);
      data = TemplateLayout.augmentDataWithContent(data, templateContent);
    }

    return templateContent;
  }
}

module.exports = TemplateLayout;
