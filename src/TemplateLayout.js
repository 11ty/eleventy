const { TemplatePath } = require("@11ty/eleventy-utils");

const TemplateLayoutPathResolver = require("./TemplateLayoutPathResolver");
const TemplateContent = require("./TemplateContent");
const TemplateData = require("./TemplateData");

const templateCache = require("./TemplateCache");
// const debug = require("debug")("Eleventy:TemplateLayout");
const debugDev = require("debug")("Dev:Eleventy:TemplateLayout");

class TemplateLayout extends TemplateContent {
  constructor(key, inputDir, extensionMap, config) {
    if (!config) {
      throw new Error("Expected `config` in TemplateLayout constructor.");
    }

    let resolver = new TemplateLayoutPathResolver(key, inputDir, extensionMap, config);
    let resolvedPath = resolver.getFullPath();

    super(resolvedPath, inputDir, config);

    if (!extensionMap) {
      throw new Error("Expected `extensionMap` in TemplateLayout constructor.");
    }

    this.extensionMap = extensionMap;
    this.key = resolver.getNormalizedLayoutKey();
    this.dataKeyLayoutPath = key;
    this.inputPath = resolvedPath;
    this.inputDir = inputDir;
  }

  getKey() {
    return this.key;
  }

  getFullKey() {
    return TemplateLayout.resolveFullKey(this.dataKeyLayoutPath, this.inputDir);
  }

  getCacheKeys() {
    return new Set([this.dataKeyLayoutPath, this.getFullKey(), this.key]);
  }

  static resolveFullKey(key, inputDir) {
    return TemplatePath.join(inputDir, key);
  }

  static getTemplate(key, inputDir, config, extensionMap) {
    if (!config.useTemplateCache) {
      return new TemplateLayout(key, inputDir, extensionMap, config);
    }

    let fullKey = TemplateLayout.resolveFullKey(key, inputDir);
    if (!templateCache.has(fullKey)) {
      let layout = new TemplateLayout(key, inputDir, extensionMap, config);

      templateCache.add(layout);
      debugDev("Added %o to TemplateCache", key);

      return layout;
    }

    return templateCache.get(fullKey);
  }

  async getTemplateLayoutMapEntry() {
    return {
      // Used by `TemplateLayout.getTemplate()`
      key: this.dataKeyLayoutPath,
      inputDir: this.inputDir,

      // used by `this.getData()`
      frontMatterData: await this.getFrontMatterData(),
    };
  }

  async getTemplateLayoutMap() {
    if (!this.cachedLayoutMap) {
      this.cachedLayoutMap = new Promise(async (resolve, reject) => {
        try {
          // For both the eleventy.layouts event and cyclical layout chain checking  (e.g., a => b => c => a)
          let layoutChain = new Set();
          layoutChain.add(this.inputPath);

          let cfgKey = this.config.keys.layout;
          let map = [];
          let mapEntry = await this.getTemplateLayoutMapEntry();

          map.push(mapEntry);

          while (mapEntry.frontMatterData && cfgKey in mapEntry.frontMatterData) {
            // Layout of the current layout
            let parentLayoutKey = mapEntry.frontMatterData[cfgKey];

            let layout = TemplateLayout.getTemplate(
              parentLayoutKey,
              mapEntry.inputDir,
              this.config,
              this.extensionMap
            );

            // Abort if a circular layout chain is detected. Otherwise, we'll time out and run out of memory.
            if (layoutChain.has(layout.inputPath)) {
              throw new Error(
                `Your layouts have a circular reference, starting at ${map[0].key}! The layout at ${layout.inputPath} was specified twice in this layout chain.`
              );
            }

            // Keep track of this layout so we can detect duplicates in subsequent iterations
            layoutChain.add(layout.inputPath);

            // reassign for next loop
            mapEntry = await layout.getTemplateLayoutMapEntry();

            map.push(mapEntry);
          }

          this.layoutChain = Array.from(layoutChain);

          resolve(map);
        } catch (e) {
          reject(e);
        }
      });
    }

    return this.cachedLayoutMap;
  }

  async getLayoutChain() {
    if (!Array.isArray(this.layoutChain)) {
      await this.getTemplateLayoutMap();
    }

    return this.layoutChain;
  }

  async getData() {
    if (!this.dataCache) {
      this.dataCache = new Promise(async (resolve, reject) => {
        try {
          let map = await this.getTemplateLayoutMap();
          let dataToMerge = [];
          for (let j = map.length - 1; j >= 0; j--) {
            dataToMerge.push(map[j].frontMatterData);
          }

          // Deep merge of layout front matter
          let data = TemplateData.mergeDeep(this.config, {}, ...dataToMerge);
          delete data[this.config.keys.layout];

          resolve(data);
        } catch (e) {
          reject(e);
        }
      });
    }

    return this.dataCache;
  }

  // Do only cache this layout’s render function and delegate the rest to the other templates.
  async getCachedCompiledLayoutFunction() {
    if (!this.cachedCompiledLayoutFunction) {
      this.cachedCompiledLayoutFunction = new Promise(async (resolve, reject) => {
        try {
          let rawInput = await this.getPreRender();
          let renderFunction = await this.compile(rawInput);
          resolve(renderFunction);
        } catch (e) {
          reject(e);
        }
      });
    }

    return this.cachedCompiledLayoutFunction;
  }

  async getCompiledLayoutFunctions() {
    let layoutMap = await this.getTemplateLayoutMap();
    let fns = [];

    try {
      fns.push({
        render: await this.getCachedCompiledLayoutFunction(),
      });

      if (layoutMap.length > 1) {
        let [currentLayout, parentLayout] = layoutMap;
        let { key, inputDir } = parentLayout;

        let layoutTemplate = TemplateLayout.getTemplate(
          key,
          inputDir,
          this.config,
          this.extensionMap
        );

        // The parent already includes the rest of the layout chain
        let upstreamFns = await layoutTemplate.getCompiledLayoutFunctions();
        for (let j = 0, k = upstreamFns.length; j < k; j++) {
          fns.push(upstreamFns[j]);
        }
      }

      return fns;
    } catch (e) {
      debugDev("Clearing TemplateCache after error.");
      templateCache.clear();
      throw e;
    }
  }

  static augmentDataWithContent(data, templateContent) {
    data = data || {};

    if (templateContent !== undefined) {
      data.content = templateContent;
      data.layoutContent = templateContent;
    }

    return data;
  }

  // Inefficient? We want to compile all the templatelayouts into a single reusable callback?
  // Trouble: layouts may need data variables present downstream/upstream
  // This is called from Template->renderPageEntry
  async render(data, templateContent) {
    data = TemplateLayout.augmentDataWithContent(data, templateContent);

    let compiledFunctions = await this.getCompiledLayoutFunctions();

    for (let { render } of compiledFunctions) {
      templateContent = await render(data);
      data = TemplateLayout.augmentDataWithContent(data, templateContent);
    }

    return templateContent;
  }

  resetCaches(types) {
    super.resetCaches(types);

    delete this.dataCache;
    delete this.layoutChain;
    delete this.cachedLayoutMap;
    delete this.cachedCompiledLayoutFunction;
  }
}

module.exports = TemplateLayout;
