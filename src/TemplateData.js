const fs = require("fs-extra");
const pify = require("pify");
const globby = require("globby");
const parsePath = require("parse-filepath");
const lodashset = require("lodash.set");
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

  this.rawImports = {};
  this.rawImports[this.config.keys.package] = this.getJsonRaw(
    TemplatePath.localPath("package.json")
  );

  this.globalData = null;
}

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
  let globalData = {};
  let files = await this.getGlobalDataFiles();

  for (let j = 0, k = files.length; j < k; j++) {
    let folders = await this.getObjectPathForDataFile(files[j]);
    debug(`Found global data file ${files[j]} and adding as: ${folders}`);
    let data = await this.getJson(files[j], this.rawImports);
    lodashset(globalData, folders, data);
  }
  return globalData;
};

TemplateData.prototype.getData = async function() {
  if (!this.globalData) {
    let globalJson = await this.getAllGlobalData();

    this.globalData = Object.assign({}, globalJson, this.rawImports);
  }

  return this.globalData;
};

TemplateData.prototype.getLocalData = async function(localDataPath) {
  let importedData = await this.getJson(localDataPath, this.rawImports);
  let globalData = await this.getData();

  return Object.assign({}, globalData, importedData);
};

TemplateData.prototype._getLocalJson = function(path) {
  // TODO convert to pify and async
  let rawInput;
  try {
    rawInput = fs.readFileSync(path, "utf-8");
  } catch (e) {
    // if file does not exist, return empty obj
    return "{}";
  }

  return rawInput;
};

TemplateData.prototype.getJsonRaw = function(path) {
  return JSON.parse(this._getLocalJson(path));
};

TemplateData.prototype.getJson = async function(path, rawImports) {
  let rawInput = this._getLocalJson(path);
  let fn = await new TemplateRender(
    this.config.dataTemplateEngine
  ).getCompiledTemplate(rawInput);

  // pass in rawImports, don’t pass in global data, that’s what we’re parsing
  let str = await fn(rawImports);
  return JSON.parse(str);
};

module.exports = TemplateData;
