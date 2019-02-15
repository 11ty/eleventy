const fs = require("fs-extra");
const fastglob = require("fast-glob");
const parsePath = require("parse-filepath");
const lodashset = require("lodash/set");
const lodashUniq = require("lodash/uniq");
const merge = require("./Util/Merge");
const TemplateRender = require("./TemplateRender");
const TemplatePath = require("./TemplatePath");
const TemplateGlob = require("./TemplateGlob");
const EleventyExtensionMap = require("./EleventyExtensionMap");
const EleventyBaseError = require("./EleventyBaseError");
const bench = require("./BenchmarkManager").get("Data");
const config = require("./Config");
const debugWarn = require("debug")("Eleventy:Warnings");
const debug = require("debug")("Eleventy:TemplateData");
const debugDev = require("debug")("Dev:Eleventy:TemplateData");

class TemplateDataParseError extends EleventyBaseError {}

class TemplateData {
  constructor(inputDir) {
    this.config = config.getConfig();
    this.dataTemplateEngine = this.config.dataTemplateEngine;

    this.inputDirNeedsCheck = false;
    this.setInputDir(inputDir);

    this.rawImports = {};
    this.globalData = null;
  }

  /* Used by tests */
  _setConfig(config) {
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

  getRawImports() {
    let pkgPath = TemplatePath.absolutePath("package.json");

    try {
      this.rawImports[this.config.keys.package] = require(pkgPath);
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
      let globalPathStat = await fs.stat(this.inputDir);

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

  async getTemplateDataFileGlob() {
    let dir = await this.getInputDir();
    return TemplatePath.addLeadingDotSlashArray([
      `${dir}/**/*.json`, // covers .11tydata.json too
      `${dir}/**/*${this.config.jsDataFileSuffix}.js`
    ]);
  }

  async getTemplateJavaScriptDataFileGlob() {
    let dir = await this.getInputDir();
    return TemplatePath.addLeadingDotSlashArray([
      `${dir}/**/*${this.config.jsDataFileSuffix}.js`
    ]);
  }

  async getGlobalDataGlob() {
    let dir = await this.getInputDir();
    return [this._getGlobalDataGlobByExtension(dir, "(json|js)")];
  }

  getWatchPathCache() {
    return this.pathCache;
  }

  async getGlobalDataFiles() {
    let paths = await fastglob.async(await this.getGlobalDataGlob());
    this.pathCache = paths;
    return paths;
  }

  getObjectPathForDataFile(path) {
    let reducedPath = TemplatePath.stripLeadingSubPath(path, this.dataDir);
    let parsed = parsePath(reducedPath);
    let folders = parsed.dir ? parsed.dir.split("/") : [];
    folders.push(parsed.name);

    return folders.join(".");
  }

  async getAllGlobalData() {
    let rawImports = this.getRawImports();
    let globalData = {};
    let files = TemplatePath.addLeadingDotSlashArray(
      await this.getGlobalDataFiles()
    );
    let dataFileConflicts = {};

    for (let j = 0, k = files.length; j < k; j++) {
      let folders = await this.getObjectPathForDataFile(files[j]);

      // TODO maybe merge these two? (if both valid objects)
      if (dataFileConflicts[folders]) {
        debugWarn(
          `Warning: the key for a global data file (${
            files[j]
          }) will overwrite data from an already existing global data file (${
            dataFileConflicts[folders]
          })`
        );
      }
      dataFileConflicts[folders] = files[j];

      debug(`Found global data file ${files[j]} and adding as: ${folders}`);
      let data = await this.getDataValue(files[j], rawImports);
      lodashset(globalData, folders, data);
    }

    return globalData;
  }

  async getData() {
    let rawImports = this.getRawImports();

    if (!this.globalData) {
      let globalJson = await this.getAllGlobalData();

      // OK: Shallow merge when combining rawImports (pkg) with global data files
      this.globalData = Object.assign({}, globalJson, rawImports);
    }

    return this.globalData;
  }

  /* Template and Directory data files */
  async combineLocalData(localDataPaths) {
    let localData = {};
    if (!Array.isArray(localDataPaths)) {
      localDataPaths = [localDataPaths];
    }
    for (let path of localDataPaths) {
      // clean up data for template/directory data files only.
      let dataForPath = await this.getDataValue(path, null, true);
      let cleanedDataForPath = TemplateData.cleanupData(dataForPath);
      TemplateData.mergeDeep(this.config, localData, cleanedDataForPath);
      // debug("`combineLocalData` (iterating) for %o: %O", path, localData);
    }
    return localData;
  }

  async getLocalData(templatePath) {
    let localDataPaths = await this.getLocalDataPaths(templatePath);
    let importedData = await this.combineLocalData(localDataPaths);
    let globalData = await this.getData();

    // OK-ish: shallow merge when combining template/data dir files with global data files
    let localData = Object.assign({}, globalData, importedData);
    // debug("`getLocalData` for %o: %O", templatePath, localData);
    return localData;
  }

  async _getLocalJsonString(path) {
    let rawInput;
    try {
      rawInput = await fs.readFile(path, "utf-8");
    } catch (e) {
      // if file does not exist, return nothing
    }
    return rawInput;
  }

  async getDataValue(path, rawImports, ignoreProcessing) {
    if (ignoreProcessing || TemplatePath.getExtension(path) === "js") {
      let localPath = TemplatePath.absolutePath(path);
      if (await fs.pathExists(localPath)) {
        let dataBench = bench.get(`\`${path}\``);
        dataBench.before();
        delete require.cache[localPath];
        let returnValue = require(localPath);
        if (typeof returnValue === "function") {
          returnValue = await returnValue();
        }

        dataBench.after();
        return returnValue;
      } else {
        return {};
      }
    } else {
      let rawInput = await this._getLocalJsonString(path);
      let engineName = this.dataTemplateEngine;

      if (rawInput) {
        if (ignoreProcessing || engineName === false) {
          try {
            return JSON.parse(rawInput);
          } catch (e) {
            throw new TemplateDataParseError(
              `Having trouble parsing data file ${path}`,
              e
            );
          }
        } else {
          let fn = await new TemplateRender(engineName).getCompiledTemplate(
            rawInput
          );

          try {
            // pass in rawImports, don’t pass in global data, that’s what we’re parsing
            return JSON.parse(await fn(rawImports));
          } catch (e) {
            throw new TemplateDataParseError(
              `Having trouble parsing data file ${path}`,
              e
            );
          }
        }
      }
    }

    return {};
  }

  async getLocalDataPaths(templatePath) {
    let paths = [];
    let parsed = parsePath(templatePath);
    let inputDir = TemplatePath.addLeadingDotSlash(
      TemplatePath.normalize(this.inputDir)
    );
    debugDev("getLocalDataPaths(%o)", templatePath);
    debugDev("parsed.dir: %o", parsed.dir);

    if (parsed.dir) {
      let fileNameNoExt = EleventyExtensionMap.removeTemplateExtension(
        parsed.base
      );
      let filePathNoExt = parsed.dir + "/" + fileNameNoExt;
      let dataSuffix = this.config.jsDataFileSuffix;
      debug("Using %o to find data files.", dataSuffix);
      paths.push(filePathNoExt + dataSuffix + ".js");
      paths.push(filePathNoExt + dataSuffix + ".json");
      paths.push(filePathNoExt + ".json");

      let allDirs = TemplatePath.getAllDirs(parsed.dir);
      debugDev("allDirs: %o", allDirs);
      for (let dir of allDirs) {
        let lastDir = TemplatePath.getLastPathSegment(dir);
        let dirPathNoExt = dir + "/" + lastDir;

        if (!inputDir) {
          paths.push(dirPathNoExt + dataSuffix + ".js");
          paths.push(dirPathNoExt + dataSuffix + ".json");
          paths.push(dirPathNoExt + ".json");
        } else {
          debugDev("dirStr: %o; inputDir: %o", dir, inputDir);
          if (dir.indexOf(inputDir) === 0 && dir !== inputDir) {
            paths.push(dirPathNoExt + dataSuffix + ".js");
            paths.push(dirPathNoExt + dataSuffix + ".json");
            paths.push(dirPathNoExt + ".json");
          }
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
    if ("tags" in data && typeof data.tags === "string") {
      data.tags = data.tags ? [data.tags] : [];
    }

    return data;
  }
}

module.exports = TemplateData;
