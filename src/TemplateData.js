const fs = require("fs-extra");
const pify = require("pify");
const globby = require("globby");
const parsePath = require("parse-filepath");
const lodashset = require("lodash.set");
const lodashMerge = require("lodash.merge");
const TemplateRender = require("./TemplateRender");
const TemplatePath = require("./TemplatePath");
const TemplateGlob = require("./TemplateGlob");
const config = require("./Config");
const debug = require("debug")("Eleventy:TemplateData");

function TemplateData(inputDir) {
  this.config = config.getConfig();
  this.inputDir = inputDir;
  this.dataDir =
    inputDir + "/" + (this.config.dir.data !== "." ? this.config.dir.data : "");

  this.fetchedRawImports = false;
  this.rawImports = {};

  this.globalData = null;
}

TemplateData.prototype.getRawImports = async function() {
  if (!this.fetchedRawImports) {
    this.fetchedRawImports = true;

    this.rawImports[this.config.keys.package] = await this.getJsonRaw(
      TemplatePath.localPath("package.json")
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

TemplateData.prototype.getGlobalDataGlob = async function() {
  let dir = ".";

  if (this.inputDir) {
    let globalPathStat = await pify(fs.stat)(this.inputDir);

    if (!globalPathStat.isDirectory()) {
      throw new Error("Could not find data path directory: " + this.inputDir);
    }

    dir = this.inputDir;
  }

  return TemplateGlob.normalizePath(
    dir,
    "/",
    this.config.dir.data !== "." ? this.config.dir.data : "",
    "/**/*.json"
  );
};

TemplateData.prototype.getGlobalDataFiles = async function() {
  return globby(await this.getGlobalDataGlob());
};

TemplateData.prototype.getObjectPathForDataFile = function(path) {
  let reducedPath = TemplatePath.stripPathFromDir(path, this.dataDir);
  let parsed = parsePath(reducedPath);
  let folders = parsed.dir ? parsed.dir.split("/") : [];
  folders.push(parsed.name);

  return folders.join(".");
};

TemplateData.prototype.getAllGlobalData = async function() {
  let rawImports = await this.getRawImports();
  let globalData = {};
  let files = await this.getGlobalDataFiles();

  for (let j = 0, k = files.length; j < k; j++) {
    let folders = await this.getObjectPathForDataFile(files[j]);
    debug(`Found global data file ${files[j]} and adding as: ${folders}`);
    let data = await this.getJson(files[j], rawImports);
    lodashset(globalData, folders, data);
  }
  return globalData;
};

TemplateData.prototype.getData = async function() {
  let rawImports = await this.getRawImports();

  if (!this.globalData) {
    let globalJson = await this.getAllGlobalData();

    this.globalData = Object.assign({}, globalJson, rawImports);
  }

  return this.globalData;
};

TemplateData.prototype.combineLocalData = async function(localDataPaths) {
  let rawImports = await this.getRawImports();
  let localData = {};
  if (!Array.isArray(localDataPaths)) {
    localDataPaths = [localDataPaths];
  }

  for (let path of localDataPaths) {
    let dataForPath = await this.getJson(path, rawImports);
    lodashMerge(localData, dataForPath);
  }
  return localData;
};

TemplateData.prototype.getLocalData = async function(localDataPaths) {
  let importedData = await this.combineLocalData(localDataPaths);
  let globalData = await this.getData();

  return Object.assign({}, globalData, importedData);
};

TemplateData.prototype._getLocalJson = async function(path) {
  let rawInput;
  try {
    rawInput = await pify(fs.readFile)(path, "utf-8");
  } catch (e) {
    // if file does not exist, return nothing
  }
  return rawInput;
};

TemplateData.prototype.getJsonRaw = async function(path) {
  let rawContent = await this._getLocalJson(path);
  return rawContent ? JSON.parse(rawContent) : {};
};

TemplateData.prototype.getJson = async function(path, rawImports) {
  let rawInput = await this._getLocalJson(path);

  if (rawInput) {
    let fn = await new TemplateRender(
      this.config.dataTemplateEngine
    ).getCompiledTemplate(rawInput);

    // pass in rawImports, don’t pass in global data, that’s what we’re parsing
    let str = await fn(rawImports);
    return JSON.parse(str);
  }

  return {};
};

module.exports = TemplateData;
