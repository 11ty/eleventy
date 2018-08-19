const fs = require("fs-extra");
const fastglob = require("fast-glob");
const parsePath = require("parse-filepath");
const lodashset = require("lodash.set");
const lodashMerge = require("lodash.merge");
const lodashUniq = require("lodash.uniq");
const TemplateRender = require("./TemplateRender");
const TemplatePath = require("./TemplatePath");
const TemplateGlob = require("./TemplateGlob");
const EleventyExtensionMap = require("./EleventyExtensionMap");
const config = require("./Config");
const debugWarn = require("debug")("Eleventy:Warnings");
const debug = require("debug")("Eleventy:TemplateData");
const debugDev = require("debug")("Dev:Eleventy:TemplateData");

function TemplateData(inputDir) {
  this.config = config.getConfig();
  this.dataTemplateEngine = this.config.dataTemplateEngine;

  this.inputDirNeedsCheck = false;
  this.setInputDir(inputDir);

  this.rawImports = {};
  this.globalData = null;
}

TemplateData.prototype.setInputDir = function(inputDir) {
  this.inputDirNeedsCheck = true;
  this.inputDir = inputDir;
  this.dataDir =
    inputDir + "/" + (this.config.dir.data !== "." ? this.config.dir.data : "");
};

TemplateData.prototype.setDataTemplateEngine = function(engineName) {
  this.dataTemplateEngine = engineName;
};

TemplateData.prototype.getRawImports = function() {
  let pkgPath = TemplatePath.localPath("package.json");

  try {
    this.rawImports[this.config.keys.package] = require(pkgPath);
  } catch (e) {
    debug(
      "Could not find and/or require package.json for data preprocessing at %o",
      pkgPath
    );
  }

  return this.rawImports;
};

TemplateData.prototype.getDataDir = function() {
  return this.dataDir;
};

TemplateData.prototype.clearData = function() {
  this.globalData = null;
};

TemplateData.prototype.cacheData = async function() {
  this.clearData();

  return this.getData();
};

TemplateData.prototype._getGlobalDataGlobByExtension = async function(
  dir,
  extension
) {
  return TemplateGlob.normalizePath(
    dir,
    "/",
    this.config.dir.data !== "." ? this.config.dir.data : "",
    `/**/*.${extension}`
  );
};

TemplateData.prototype._checkInputDir = async function() {
  if (this.inputDirNeedsCheck) {
    let globalPathStat = await fs.stat(this.inputDir);

    if (!globalPathStat.isDirectory()) {
      throw new Error("Could not find data path directory: " + this.inputDir);
    }

    this.inputDirNeedsCheck = false;
  }
};

TemplateData.prototype.getGlobalDataGlob = async function() {
  let dir = ".";

  if (this.inputDir) {
    await this._checkInputDir();
    dir = this.inputDir;
  }

  return [await this._getGlobalDataGlobByExtension(dir, "(json|js)")];
};

TemplateData.prototype.getGlobalDataFiles = async function() {
  return fastglob.async(await this.getGlobalDataGlob());
};

TemplateData.prototype.getObjectPathForDataFile = function(path) {
  let reducedPath = TemplatePath.stripPathFromDir(path, this.dataDir);
  let parsed = parsePath(reducedPath);
  let folders = parsed.dir ? parsed.dir.split("/") : [];
  folders.push(parsed.name);

  return folders.join(".");
};

TemplateData.prototype.getAllGlobalData = async function() {
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
};

TemplateData.prototype.getData = async function() {
  let rawImports = this.getRawImports();

  if (!this.globalData) {
    let globalJson = await this.getAllGlobalData();

    this.globalData = Object.assign({}, globalJson, rawImports);
  }

  return this.globalData;
};

TemplateData.prototype.combineLocalData = async function(localDataPaths) {
  let rawImports = this.getRawImports();
  let localData = {};
  if (!Array.isArray(localDataPaths)) {
    localDataPaths = [localDataPaths];
  }
  for (let path of localDataPaths) {
    let dataForPath = await this.getDataValue(path, rawImports, true);
    lodashMerge(localData, dataForPath);
    // debug("`combineLocalData` (iterating) for %o: %O", path, localData);
  }
  return localData;
};

TemplateData.prototype.getLocalData = async function(templatePath) {
  let localDataPaths = await this.getLocalDataPaths(templatePath);
  let importedData = await this.combineLocalData(localDataPaths);
  let globalData = await this.getData();

  let localData = Object.assign({}, globalData, importedData);
  // debug("`getLocalData` for %o: %O", templatePath, localData);
  return localData;
};

TemplateData.prototype._getLocalJsonString = async function(path) {
  let rawInput;
  try {
    rawInput = await fs.readFile(path, "utf-8");
  } catch (e) {
    // if file does not exist, return nothing
  }
  return rawInput;
};

TemplateData.prototype.getDataValue = async function(
  path,
  rawImports,
  ignoreProcessing
) {
  if (ignoreProcessing || TemplatePath.getExtension(path) === "js") {
    let localPath = TemplatePath.localPath(path);
    if (await fs.pathExists(localPath)) {
      let returnValue = require(localPath);
      if (typeof returnValue === "function") {
        return returnValue();
      }
      return returnValue;
    } else {
      return {};
    }
  } else {
    let engineName;
    if (!ignoreProcessing) {
      engineName = this.dataTemplateEngine;
    }
    let rawInput = await this._getLocalJsonString(path);
    if (rawInput) {
      if (engineName) {
        let fn = await new TemplateRender(engineName).getCompiledTemplate(
          rawInput
        );

        // pass in rawImports, don’t pass in global data, that’s what we’re parsing
        return JSON.parse(await fn(rawImports));
      } else {
        return JSON.parse(rawInput);
      }
    }
  }

  return {};
};

TemplateData.prototype.getLocalDataPaths = async function(templatePath) {
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
    paths.push(filePathNoExt + ".json");
    paths.push(filePathNoExt + dataSuffix + ".js");
    paths.push(filePathNoExt + dataSuffix + ".json");

    let allDirs = TemplatePath.getAllDirs(parsed.dir);
    debugDev("allDirs: %o", allDirs);
    for (let dir of allDirs) {
      let lastDir = TemplatePath.getLastDir(dir);
      let dirPathNoExt = dir + "/" + lastDir;

      if (!inputDir) {
        paths.push(dirPathNoExt + ".json");
        paths.push(dirPathNoExt + dataSuffix + ".js");
        paths.push(dirPathNoExt + dataSuffix + ".json");
      } else {
        debugDev("dirStr: %o; inputDir: %o", dir, inputDir);
        if (dir.indexOf(inputDir) === 0 && dir !== inputDir) {
          paths.push(dirPathNoExt + ".json");
          paths.push(dirPathNoExt + dataSuffix + ".js");
          paths.push(dirPathNoExt + dataSuffix + ".json");
        }
      }
    }
  }

  debug("getLocalDataPaths(%o): %o", templatePath, paths);
  return lodashUniq(paths).reverse();
};

module.exports = TemplateData;
