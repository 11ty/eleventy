import { existsSync, promises } from "node:fs";
import { createRequire } from "node:module";
import { parse, sep } from "node:path";
import fastglob from "fast-glob";
import lodashset from "lodash/set.js";
import lodashget from "lodash/get.js";
import lodashUniq from "lodash/uniq.js";
import { TemplatePath, isPlainObject } from "@11ty/eleventy-utils";

import merge from "./Util/Merge.js";
import TemplateRender from "./TemplateRender.js";
import TemplateGlob from "./TemplateGlob.js";
import EleventyExtensionMap from "./EleventyExtensionMap.js";
import EleventyBaseError from "./EleventyBaseError.js";
import TemplateDataInitialGlobalData from "./TemplateDataInitialGlobalData.js";

import Debug from "debug";
const debugWarn = Debug("Eleventy:Warnings");
const debug = Debug("Eleventy:TemplateData");
const debugDev = Debug("Dev:Eleventy:TemplateData");

class FSExistsCache {
  constructor() {
    this._cache = new Map();
  }
  has(path) {
    return this._cache.has(path);
  }
  exists(path) {
    let exists = this._cache.get(path);
    if (!this.has(path)) {
      exists = existsSync(path);
      this._cache.set(path, exists);
    }
    return exists;
  }
  markExists(path, value = true) {
    this._cache.set(path, !!value);
  }
}

class TemplateDataConfigError extends EleventyBaseError {}
class TemplateDataParseError extends EleventyBaseError {}

export default class TemplateData {
  constructor(inputDir, eleventyConfig) {
    if (!eleventyConfig) {
      throw new TemplateDataConfigError("Missing `config`.");
    }
    this.eleventyConfig = eleventyConfig;
    this._inputDir = inputDir;
  }

  async init() {
    this.config = await this.eleventyConfig.getConfig();
    this.benchmarks = {
      data: this.config.benchmarkManager.get("Data"),
      aggregate: this.config.benchmarkManager.get("Aggregate"),
    };

    this.dataTemplateEngine = this.config.dataTemplateEngine;

    this.inputDirNeedsCheck = false;
    this.setInputDir(this._inputDir);

    this.rawImports = {};
    this.globalData = null;
    this.templateDirectoryData = {};

    // It's common for data files not to exist, so we avoid going to the FS to
    // re-check if they do via a quick-and-dirty cache.
    this._fsExistsCache = new FSExistsCache();

    this.initialGlobalData = new TemplateDataInitialGlobalData(
      this.eleventyConfig
    );
  }

  get extensionMap() {
    if (!this._extensionMap) {
      this._extensionMap = new EleventyExtensionMap([], this.config);
    }
    return this._extensionMap;
  }

  set extensionMap(map) {
    this._extensionMap = map;
  }

  get environmentVariables() {
    return this._env;
  }

  set environmentVariables(env) {
    this._env = env;
  }

  /* Used by tests */
  async _setConfig(config) {
    this.config = config;
    this.dataTemplateEngine = this.config.dataTemplateEngine;
  }

  setInputDir(inputDir) {
    this.inputDirNeedsCheck = true;
    this.inputDir = inputDir;
    this.dataDir = this.config.dir.data
      ? TemplatePath.join(inputDir, this.config.dir.data)
      : inputDir;
  }

  setDataTemplateEngine(engineName) {
    this.dataTemplateEngine = engineName;
  }

  async getRawImports() {
    let pkgPath = TemplatePath.absolutePath("package.json");

    try {
      this.rawImports[this.config.keys.package] = await import(pkgPath, {
        type: "json",
      });
    } catch (e) {
      debug(
        "Could not find and/or require package.json for data preprocessing at %o",
        pkgPath
      );
    }

    return this.rawImports;
  }

  getDataDir() {
    return this.dataDir;
  }

  clearData() {
    this.globalData = null;
    this.templateDirectoryData = {};
  }

  async cacheData() {
    this.clearData();

    return this.getData();
  }

  _getGlobalDataGlobByExtension(dir, extension) {
    return TemplateGlob.normalizePath(
      dir,
      "/",
      this.config.dir.data !== "." ? this.config.dir.data : "",
      `/**/*.${extension}`
    );
  }

  async _checkInputDir() {
    if (this.inputDirNeedsCheck) {
      let globalPathStat = await promises.stat(this.inputDir);

      if (!globalPathStat.isDirectory()) {
        throw new Error("Could not find data path directory: " + this.inputDir);
      }

      this.inputDirNeedsCheck = false;
    }
  }

  async getInputDir() {
    let dir = ".";

    if (this.inputDir) {
      await this._checkInputDir();
      dir = this.inputDir;
    }

    return dir;
  }

  // This is used exclusively for --watch and --serve chokidar targets
  async getTemplateDataFileGlob() {
    let dir = await this.getInputDir();
    let paths = [
      `${dir}/**/*.json`, // covers .11tydata.json too
      `${dir}/**/*${this.config.jsDataFileSuffix}.cjs`,
      `${dir}/**/*${this.config.jsDataFileSuffix}.js`,
    ];

    if (this.hasUserDataExtensions()) {
      let userPaths = this.getUserDataExtensions().map(
        (extension) => `${dir}/**/*.${extension}` // covers .11tydata.{extension} too
      );
      paths = userPaths.concat(paths);
    }

    return TemplatePath.addLeadingDotSlashArray(paths);
  }

  async getTemplateJavaScriptDataFileGlob() {
    let dir = await this.getInputDir();
    return TemplatePath.addLeadingDotSlashArray([
      `${dir}/**/*${this.config.jsDataFileSuffix}.js`,
    ]);
  }

  async getGlobalDataGlob() {
    let dir = await this.getInputDir();

    let extGlob = this.getGlobalDataExtensionPriorities().join("|");
    return [this._getGlobalDataGlobByExtension(dir, "(" + extGlob + ")")];
  }

  getWatchPathCache() {
    return this.pathCache;
  }

  getGlobalDataExtensionPriorities() {
    return this.getUserDataExtensions().concat(["json", "cjs", "js"]);
  }

  static calculateExtensionPriority(path, priorities) {
    for (let i = 0; i < priorities.length; i++) {
      let ext = priorities[i];
      if (path.endsWith(ext)) {
        return i;
      }
    }
    return priorities.length;
  }

  async getGlobalDataFiles() {
    let priorities = this.getGlobalDataExtensionPriorities();

    let fsBench = this.benchmarks.aggregate.get("Searching the file system");
    fsBench.before();
    let paths = fastglob.sync(await this.getGlobalDataGlob(), {
      caseSensitiveMatch: false,
      dot: true,
    });
    fsBench.after();

    // sort paths according to extension priorities
    // here we use reverse ordering, because paths with bigger index in array will override the first ones
    // example [path/file.json, path/file.js] here js will override json
    paths = paths.sort((first, second) => {
      let p1 = TemplateData.calculateExtensionPriority(first, priorities);
      let p2 = TemplateData.calculateExtensionPriority(second, priorities);
      if (p1 < p2) {
        return -1;
      }
      if (p1 > p2) {
        return 1;
      }
      return 0;
    });

    this.pathCache = paths;
    return paths;
  }

  getObjectPathForDataFile(dataFilePath) {
    let reducedPath = TemplatePath.stripLeadingSubPath(
      dataFilePath,
      this.dataDir
    );
    let parsed = parse(reducedPath);
    let folders = parsed.dir ? parsed.dir.split("/") : [];
    folders.push(parsed.name);

    return folders;
  }

  async getAllGlobalData() {
    let rawImports = await this.getRawImports();
    let globalData = {};
    let files = TemplatePath.addLeadingDotSlashArray(
      await this.getGlobalDataFiles()
    );

    this.config.events.emit("eleventy.globalDataFiles", files);

    let dataFileConflicts = {};

    for (let j = 0, k = files.length; j < k; j++) {
      let data = await this.getDataValue(files[j], rawImports);
      let objectPathTarget = this.getObjectPathForDataFile(files[j]);

      // Since we're joining directory paths and an array is not useable as an objectkey since two identical arrays are not double equal,
      // we can just join the array by a forbidden character ("/"" is chosen here, since it works on Linux, Mac and Windows).
      // If at some point this isn't enough anymore, it would be possible to just use JSON.stringify(objectPathTarget) since that
      // is guaranteed to work but is signifivcantly slower.
      let objectPathTargetString = objectPathTarget.join(sep);

      // if two global files have the same path (but different extensions)
      // and conflict, let’s merge them.
      if (dataFileConflicts[objectPathTargetString]) {
        debugWarn(
          `merging global data from ${files[j]} with an already existing global data file (${dataFileConflicts[objectPathTargetString]}). Overriding existing keys.`
        );

        let oldData = lodashget(globalData, objectPathTarget);
        data = TemplateData.mergeDeep(this.config, oldData, data);
      }

      dataFileConflicts[objectPathTargetString] = files[j];
      debug(
        `Found global data file ${files[j]} and adding as: ${objectPathTarget}`
      );
      lodashset(globalData, objectPathTarget, data);
    }

    return globalData;
  }

  async getInitialGlobalData() {
    let globalData = await this.initialGlobalData.getData();

    if (this.environmentVariables) {
      if (!("env" in globalData.eleventy)) {
        globalData.eleventy.env = {};
      }
      Object.assign(globalData.eleventy.env, this.environmentVariables);
    }

    return globalData;
  }

  async getData() {
    let rawImports = await this.getRawImports();

    if (!this.globalData) {
      this.configApiGlobalData = await this.getInitialGlobalData();

      let globalJson = await this.getAllGlobalData();
      let mergedGlobalData = merge(globalJson, this.configApiGlobalData);

      // OK: Shallow merge when combining rawImports (pkg) with global data files
      this.globalData = Object.assign({}, mergedGlobalData, rawImports);
    }

    return this.globalData;
  }

  /* Template and Directory data files */
  async combineLocalData(localDataPaths) {
    let localData = {};
    if (!Array.isArray(localDataPaths)) {
      localDataPaths = [localDataPaths];
    }

    // Filter out files we know don't exist to avoid overhead for checking
    localDataPaths = localDataPaths.filter((path) => {
      return this._fsExistsCache.exists(path);
    });

    this.config.events.emit("eleventy.dataFiles", localDataPaths);

    if (!localDataPaths.length) {
      return localData;
    }

    for (let path of localDataPaths) {
      let dataForPath = await this.getDataValue(path, null, true);
      if (!isPlainObject(dataForPath)) {
        debug(
          "Warning: Template and Directory data files expect an object to be returned, instead `%o` returned `%o`",
          path,
          dataForPath
        );
      } else {
        // clean up data for template/directory data files only.
        let cleanedDataForPath = TemplateData.cleanupData(dataForPath);
        TemplateData.mergeDeep(this.config, localData, cleanedDataForPath);
      }
    }
    return localData;
  }

  async getTemplateDirectoryData(templatePath) {
    if (!this.templateDirectoryData[templatePath]) {
      let localDataPaths = await this.getLocalDataPaths(templatePath);
      let importedData = await this.combineLocalData(localDataPaths);

      this.templateDirectoryData[templatePath] = Object.assign(
        {},
        importedData
      );
    }
    return this.templateDirectoryData[templatePath];
  }

  async getGlobalData() {
    return this.getData();
  }

  getUserDataExtensions() {
    if (!this.config.dataExtensions) {
      return [];
    }

    // returning extensions in reverse order to create proper extension order
    // later added formats will override first ones
    return Array.from(this.config.dataExtensions.keys()).reverse();
  }

  getUserDataParser(extension) {
    return this.config.dataExtensions.get(extension);
  }

  isUserDataExtension(extension) {
    return (
      this.config.dataExtensions && this.config.dataExtensions.has(extension)
    );
  }

  hasUserDataExtensions() {
    return this.config.dataExtensions && this.config.dataExtensions.size > 0;
  }

  async _loadFileContents(path, options = {}) {
    let rawInput;
    let encoding = "utf8";
    if ("encoding" in options) {
      encoding = options.encoding;
    }

    try {
      rawInput = await promises.readFile(path, encoding);
    } catch (e) {
      // if file does not exist, return nothing
    }
    return rawInput;
  }

  async _parseDataFile(
    path,
    rawImports,
    ignoreProcessing,
    parser,
    options = {}
  ) {
    let readFile = !("read" in options) || options.read === true;
    let engineName = this.dataTemplateEngine;
    let processAsTemplate = !ignoreProcessing && engineName !== false;

    let rawInput;
    if (readFile || processAsTemplate) {
      rawInput = await this._loadFileContents(path, options);
    }

    if (readFile && !rawInput) {
      return {};
    }

    if (!processAsTemplate) {
      try {
        if (readFile) {
          return parser(rawInput, path);
        } else {
          return parser(path);
        }
      } catch (e) {
        throw new TemplateDataParseError(
          `Having trouble parsing data file ${path}`,
          e
        );
      }
    } else {
      // processing will always read the input file
      let tr = new TemplateRender(engineName, this.inputDir, await this.config);
      tr.extensionMap = this.extensionMap;

      let fn = await tr.getCompiledTemplate(rawInput);

      try {
        // pass in rawImports, don’t pass in global data, that’s what we’re parsing
        let raw = await fn(rawImports);
        return parser(raw);
      } catch (e) {
        throw new TemplateDataParseError(
          `Having trouble parsing data file ${path}`,
          e
        );
      }
    }
  }

  // ignoreProcessing = false for global data files
  // ignoreProcessing = true for local data files
  async getDataValue(path, rawImports, ignoreProcessing) {
    let extension = TemplatePath.getExtension(path);

    if (
      extension === "js" ||
      extension === "cjs" ||
      (extension === "json" && (ignoreProcessing || !this.dataTemplateEngine))
    ) {
      // JS data file or require’d JSON (no preprocessing needed)
      let localPath = TemplatePath.absolutePath(path);
      let exists = this._fsExistsCache.exists(localPath);
      // Make sure that relative lookups benefit from cache
      this._fsExistsCache.markExists(path, exists);

      if (!exists) {
        return {};
      }

      let aggregateDataBench = this.benchmarks.aggregate.get("Data File");
      aggregateDataBench.before();
      let dataBench = this.benchmarks.data.get(`\`${path}\``);
      dataBench.before();

      let returnValue;
      try {
        if (extension === "js") returnValue = await import(localPath);
        else if (extension === "cjs") {
          const require = createRequire(import.meta.url);
          returnValue = require(localPath);
        } else if (extension === "json") {
          returnValue = await import(localPath, { assert: { type: "json" } });
        }
      } catch (e) {
        console.log(localPath);
        throw e;
      }
      // TODO special exception for Global data `permalink.js`
      // module.exports = (data) => `${data.page.filePathStem}/`; // Does not work
      // module.exports = () => ((data) => `${data.page.filePathStem}/`); // Works
      if (typeof returnValue === "function") {
        returnValue = await returnValue(this.configApiGlobalData || {});
      }

      dataBench.after();
      aggregateDataBench.after();
      return returnValue;
    } else if (this.isUserDataExtension(extension)) {
      // Other extensions
      let { parser, options } = this.getUserDataParser(extension);
      return this._parseDataFile(
        path,
        rawImports,
        ignoreProcessing,
        parser,
        options
      );
    } else if (extension === "json") {
      // File to string, parse with JSON (preprocess)
      return this._parseDataFile(
        path,
        rawImports,
        ignoreProcessing,
        JSON.parse
      );
    } else {
      throw new TemplateDataParseError(
        `Could not find an appropriate data parser for ${path}. Do you need to add a plugin to your config file?`
      );
    }
  }

  _pushExtensionsToPaths(paths, curpath, extensions) {
    for (let extension of extensions) {
      paths.push(curpath + "." + extension);
    }
  }

  _addBaseToPaths(paths, base, extensions) {
    let dataSuffix = this.config.jsDataFileSuffix;

    // data suffix
    paths.push(base + dataSuffix + ".js");
    paths.push(base + dataSuffix + ".cjs");
    paths.push(base + dataSuffix + ".json");

    // inject user extensions
    this._pushExtensionsToPaths(paths, base + dataSuffix, extensions);

    // top level
    paths.push(base + ".json");
    this._pushExtensionsToPaths(paths, base, extensions);
  }

  async getLocalDataPaths(templatePath) {
    let paths = [];
    let parsed = parse(templatePath);
    let inputDir = TemplatePath.addLeadingDotSlash(
      TemplatePath.normalize(this.inputDir)
    );

    debugDev("getLocalDataPaths(%o)", templatePath);
    debugDev("parsed.dir: %o", parsed.dir);

    let userExtensions = this.getUserDataExtensions();

    if (parsed.dir) {
      let fileNameNoExt = this.extensionMap.removeTemplateExtension(
        parsed.base
      );

      let filePathNoExt = parsed.dir + "/" + fileNameNoExt;
      let dataSuffix = this.config.jsDataFileSuffix;
      debug("Using %o to find data files.", dataSuffix);

      this._addBaseToPaths(paths, filePathNoExt, userExtensions);

      let allDirs = TemplatePath.getAllDirs(parsed.dir);

      debugDev("allDirs: %o", allDirs);
      for (let dir of allDirs) {
        let lastDir = TemplatePath.getLastPathSegment(dir);
        let dirPathNoExt = dir + "/" + lastDir;

        if (inputDir) {
          debugDev("dirStr: %o; inputDir: %o", dir, inputDir);
        }
        if (!inputDir || (dir.indexOf(inputDir) === 0 && dir !== inputDir)) {
          this._addBaseToPaths(paths, dirPathNoExt, userExtensions);
        }
      }

      // 0.11.0+ include root input dir files
      // if using `docs/` as input dir, looks for docs/docs.json et al
      if (inputDir) {
        let lastInputDir = TemplatePath.addLeadingDotSlash(
          TemplatePath.join(inputDir, TemplatePath.getLastPathSegment(inputDir))
        );
        if (lastInputDir !== "./") {
          this._addBaseToPaths(paths, lastInputDir, userExtensions);
        }
      }
    }

    debug("getLocalDataPaths(%o): %o", templatePath, paths);
    return lodashUniq(paths).reverse();
  }

  static mergeDeep(config, target, ...source) {
    if (config.dataDeepMerge) {
      return TemplateData.merge(target, ...source);
    } else {
      return Object.assign(target, ...source);
    }
  }

  static merge(target, ...source) {
    return merge(target, ...source);
  }

  static cleanupData(data) {
    if (isPlainObject(data) && "tags" in data) {
      if (typeof data.tags === "string") {
        data.tags = data.tags ? [data.tags] : [];
      } else if (data.tags === null) {
        data.tags = [];
      }

      // Deduplicate tags
      data.tags = [...new Set(data.tags)];
    }

    return data;
  }

  getServerlessPathData() {
    if (
      this.configApiGlobalData &&
      this.configApiGlobalData.eleventy &&
      this.configApiGlobalData.eleventy.serverless &&
      this.configApiGlobalData.eleventy.serverless.path
    ) {
      return this.configApiGlobalData.eleventy.serverless.path;
    }
  }
}
