import { TemplatePath } from "@11ty/eleventy-utils";

import TemplateLayoutPathResolver from "./TemplateLayoutPathResolver.js";
import TemplateContent from "./TemplateContent.js";
import TemplateData from "./TemplateData.js";
import TemplateCache from "./TemplateCache.js";
import Debug from "debug";

// const debug = Debug("Eleventy:TemplateLayout");
const debugDev = Debug("Dev:Eleventy:TemplateLayout");
const { has, get, add, clear } = TemplateCache;

export default class TemplateLayout extends TemplateContent {
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
      if (has(fullKey)) {
        debugDev("Found %o in TemplateCache", key);
        return get(fullKey);
      }

      let tmpl = new TemplateLayout(key, inputDir, extensionMap, config);
      debugDev("Added %o to TemplateCache", key);
      add(fullKey, tmpl);

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

    // Keep track of every layout we see so we can detect cyclical layout chains (e.g., a => b => c => a).
    const seenLayoutKeys = new Set();
    seenLayoutKeys.add(mapEntry.key);

    while (mapEntry.frontMatterData && cfgKey in mapEntry.frontMatterData) {
      // Layout of the current layout
      const parentLayoutKey = mapEntry.frontMatterData[cfgKey];
      // Abort if a circular layout chain is detected. Otherwise, we'll time out and run out of memory.
      if (seenLayoutKeys.has(parentLayoutKey)) {
        throw new Error(
          `Your layouts have a circular reference, starting at ${map[0].key}! The layout ${parentLayoutKey} was specified twice in this layout chain.`
        );
      }

      // Keep track of this layout so we can detect duplicates in subsequent iterations
      seenLayoutKeys.add(parentLayoutKey);

      let layout = TemplateLayout.getTemplate(
        parentLayoutKey,
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
      clear();
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
