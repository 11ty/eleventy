const fs = require("fs-extra");
const pify = require("pify");
const globby = require("globby");
const parsePath = require("parse-filepath");
const lodashset = require("lodash.set");
const TemplateRender = require("./TemplateRender");
const TemplateConfig = require("./TemplateConfig");
const TemplatePath = require("./TemplatePath");

let cfg = TemplateConfig.getDefaultConfig();

function TemplateData(globalDataPath) {
  this.globalDataPath = globalDataPath;

  this.rawImports = {};
  this.rawImports[cfg.keys.package] = this.getJsonRaw(
    TemplatePath.localPath("package.json")
  );

  this.globalData = null;
}

TemplateData.prototype.clearData = function() {
  this.globalData = null;
};

TemplateData.prototype.cacheData = async function() {
  this.clearData();

  return this.getData();
};

TemplateData.prototype.getGlobalDataGlob = async function() {
  let dir = ".";

  if (this.globalDataPath) {
    let globalPathStat = await pify(fs.stat)(this.globalDataPath);

    if (!globalPathStat.isDirectory()) {
      throw new Error(
        "Could not find data path directory: " + this.globalDataPath
      );
    }

    dir = this.globalDataPath;
  }

  return (
    TemplatePath.normalize(dir, "/", cfg.dir.data !== "." ? cfg.dir.data : "") +
    "/**/*.json"
  );
};

TemplateData.prototype.getGlobalDataFiles = async function() {
  return globby(await this.getGlobalDataGlob(), { gitignore: true });
};

TemplateData.prototype.getObjectPathForDataFile = function(path) {
  let reducedPath = TemplatePath.stripPathFromDir(
    path,
    this.globalDataPath + "/" + (cfg.dir.data !== "." ? cfg.dir.data : "")
  );
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
  let fn = await new TemplateRender(cfg.dataTemplateEngine).getCompiledTemplate(
    rawInput
  );

  // pass in rawImports, don’t pass in global data, that’s what we’re parsing
  let str = await fn(rawImports);
  return JSON.parse(str);
};

module.exports = TemplateData;
