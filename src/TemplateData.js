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
const deleteRequireCache = require("./Util/DeleteRequireCache");

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
    let paths = [
      `${dir}/**/*.json`, // covers .11tydata.json too
      `${dir}/**/*${this.config.jsDataFileSuffix}.js`
    ];

    if (this.hasUserDataExtensions()) {
      let userPaths = this.getUserDataExtensions().map(
        extension => `${dir}/**/*.${extension}` // covers .11tydata.{extension} too
      );
      paths = userPaths.concat(paths);
    }

    return TemplatePath.addLeadingDotSlashArray(paths);
  }

  async getTemplateJavaScriptDataFileGlob() {
    let dir = await this.getInputDir();
    return TemplatePath.addLeadingDotSlashArray([
      `${dir}/**/*${this.config.jsDataFileSuffix}.js`
    ]);
  }

  async getGlobalDataGlob() {
    let dir = await this.getInputDir();
    let userExtensions = "";
    // creating glob string for user extensions
    if (this.hasUserDataExtensions()) {
      userExtensions = this.getUserDataExtensions().join("|") + "|";
    }

    return [
      this._getGlobalDataGlobByExtension(dir, "(" + userExtensions + "json|js)")
    ];
  }

  getWatchPathCache() {
    return this.pathCache;
  }

  async getGlobalDataFiles() {
    let paths = await fastglob(await this.getGlobalDataGlob(), {
      caseSensitiveMatch: false,
      dot: true
    });
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
          `Warning: the key for a global data file (${files[j]}) will overwrite data from an already existing global data file (${dataFileConflicts[folders]})`
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

  async _loadFileContents(path) {
    let rawInput;
    try {
      rawInput = await fs.readFile(path, "utf-8");
    } catch (e) {
      // if file does not exist, return nothing
    }
    return rawInput;
  }

  async _parseDataFile(path, rawImports, ignoreProcessing, parser) {
    let rawInput = await this._loadFileContents(path);
    let engineName = this.dataTemplateEngine;

    if (!rawInput) {
      return {};
    }

    if (ignoreProcessing || engineName === false) {
      try {
        return parser(rawInput);
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

  async getDataValue(path, rawImports, ignoreProcessing) {
    let extension = TemplatePath.getExtension(path);

    // ignoreProcessing = false for global data files
    // ignoreProcessing = true for local data files
    if (
      extension === "js" ||
      (extension === "json" && (ignoreProcessing || !this.dataTemplateEngine))
    ) {
      // JS data file or require’d JSON (no preprocessing needed)
      let localPath = TemplatePath.absolutePath(path);
      if (!(await fs.pathExists(localPath))) {
        return {};
      }

      let dataBench = bench.get(`\`${path}\``);
      dataBench.before();
      deleteRequireCache(localPath);

      let returnValue = require(localPath);
      if (typeof returnValue === "function") {
        returnValue = await returnValue();
      }

      dataBench.after();
      return returnValue;
    } else if (this.isUserDataExtension(extension)) {
      // Other extensions
      var parser = this.getUserDataParser(extension);
      return this._parseDataFile(path, rawImports, ignoreProcessing, parser);
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

  async getLocalDataPaths(templatePath) {
    let paths = [];
    let parsed = parsePath(templatePath);
    let inputDir = TemplatePath.addLeadingDotSlash(
      TemplatePath.normalize(this.inputDir)
    );

    debugDev("getLocalDataPaths(%o)", templatePath);
    debugDev("parsed.dir: %o", parsed.dir);

    let userExtensions = this.getUserDataExtensions();

    if (parsed.dir) {
      let fileNameNoExt = EleventyExtensionMap.removeTemplateExtension(
        parsed.base
      );

      let filePathNoExt = parsed.dir + "/" + fileNameNoExt;
      let dataSuffix = this.config.jsDataFileSuffix;
      debug("Using %o to find data files.", dataSuffix);

      // data suffix
      paths.push(filePathNoExt + dataSuffix + ".js");
      paths.push(filePathNoExt + dataSuffix + ".json");
      // inject user extensions
      this._pushExtensionsToPaths(
        paths,
        filePathNoExt + dataSuffix,
        userExtensions
      );

      // top level
      paths.push(filePathNoExt + ".json");
      this._pushExtensionsToPaths(paths, filePathNoExt, userExtensions);

      let allDirs = TemplatePath.getAllDirs(parsed.dir);
      debugDev("allDirs: %o", allDirs);
      for (let dir of allDirs) {
        let lastDir = TemplatePath.getLastPathSegment(dir);
        let dirPathNoExt = dir + "/" + lastDir;

        if (!inputDir) {
          // data suffix
          paths.push(dirPathNoExt + dataSuffix + ".js");
          paths.push(dirPathNoExt + dataSuffix + ".json");
          this._pushExtensionsToPaths(
            paths,
            dirPathNoExt + dataSuffix,
            userExtensions
          );

          // top level
          paths.push(dirPathNoExt + ".json");
          this._pushExtensionsToPaths(paths, dirPathNoExt, userExtensions);
        } else {
          debugDev("dirStr: %o; inputDir: %o", dir, inputDir);
          if (dir.indexOf(inputDir) === 0 && dir !== inputDir) {
            // data suffix
            paths.push(dirPathNoExt + dataSuffix + ".js");
            paths.push(dirPathNoExt + dataSuffix + ".json");
            this._pushExtensionsToPaths(
              paths,
              dirPathNoExt + dataSuffix,
              userExtensions
            );

            // top level
            paths.push(dirPathNoExt + ".json");
            this._pushExtensionsToPaths(paths, dirPathNoExt, userExtensions);
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
    if ("tags" in data) {
      if (typeof data.tags === "string") {
        data.tags = data.tags ? [data.tags] : [];
      } else if (data.tags === null) {
        data.tags = [];
      }
    }

    return data;
  }
}

module.exports = TemplateData;
