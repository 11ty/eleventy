const fs = require("fs-extra");
const TemplateRender = require("./TemplateRender");
const TemplateConfig = require("./TemplateConfig");
const TemplatePath = require("./TemplatePath");

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();

function TemplateData(globalDataPath) {
  this.globalDataPath = globalDataPath;

  this.rawImports = {};
  this.rawImports[cfg.keys.package] = this.getJsonRaw(
    TemplatePath.localPath("package.json")
  );
}

TemplateData.prototype.getData = async function() {
  let json = await this.getJson(this.globalDataPath, this.rawImports);

  this.globalData = Object.assign({}, json, this.rawImports);

  return this.globalData;
};

TemplateData.prototype._getLocalJson = function(path) {
  // todo convert to readFile with await (and promisify?)
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
    cfg.jsonDataTemplateEngine
  ).getCompiledTemplatePromise(rawInput);

  // pass in rawImports, don’t pass in global data, that’s what we’re parsing
  let str = await fn(rawImports);
  return JSON.parse(str);
};

module.exports = TemplateData;
