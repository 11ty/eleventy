const ejs = require("ejs");
const pify = require("pify");
const fs = require("fs-extra");
const parsePath = require("parse-filepath");
const matter = require("gray-matter");
const normalize = require("normalize-path");
const clone = require("lodash.clone");
const TemplateRender = require("./TemplateRender");
const TemplatePath = require("./TemplatePath");
const Layout = require("./Layout");
const TemplateConfig = require("./TemplateConfig");

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();

function Template(path, inputDir, outputDir, templateData) {
  this.inputPath = path;
  this.inputContent = fs.readFileSync(path, "utf-8");
  this.parsed = parsePath(path);

  // for pagination
  this.extraOutputSubdirectory = "";

  if (inputDir) {
    this.inputDir = normalize(inputDir);
    this.layoutsDir = this.inputDir + "/" + cfg.dir.includes;
  } else {
    this.inputDir = false;
  }
  if (outputDir) {
    this.outputDir = normalize(outputDir);
  } else {
    this.outputDir = false;
  }

  this.frontMatter = this.getMatter();

  this.filters = [];
  this.plugins = {};
  this.templateData = templateData;
  this.dataOverrides = {};

  this.templateRender = new TemplateRender(this.inputPath, this.inputDir);

  // HTML output can’t overwrite the HTML input file.
  this.isHtmlIOException =
    this.inputDir === this.outputDir &&
    this.templateRender.isEngine("html") &&
    this.parsed.name === "index";
}

Template.prototype.getTemplateSubfolder = function() {
  var pathDir = this.parsed.dir;
  var index = pathDir.indexOf(this.inputDir);

  return TemplatePath.stripLeadingDotSlash(
    index > -1 ? pathDir.substr(this.inputDir.length + 1) : this.inputDir
  );
};

Template.prototype.setExtraOutputSubdirectory = function(dir) {
  this.extraOutputSubdirectory = dir + "/";
};

// TODO check for conflicts, see if file already exists?
Template.prototype.getOutputPath = function() {
  let permalink = this.getFrontMatterData()[cfg.keys.permalink];
  if (permalink) {
    let permalinkParsed = parsePath(permalink);
    return TemplatePath.normalize(
      this.outputDir +
        "/" +
        permalinkParsed.dir +
        "/" +
        this.extraOutputSubdirectory +
        permalinkParsed.base
    );
  }

  let dir = this.getTemplateSubfolder();
  let path =
    "/" +
    (dir ? dir + "/" : "") +
    (this.parsed.name !== "index" ? this.parsed.name + "/" : "") +
    this.extraOutputSubdirectory +
    "index" +
    (this.isHtmlIOException ? cfg.htmlOutputSuffix : "") +
    ".html";
  // console.log( this.inputPath,"|", this.inputDir, "|", dir );
  return normalize(this.outputDir + path);
};

Template.prototype.setDataOverrides = function(overrides) {
  this.dataOverrides = overrides;
};

Template.prototype.isIgnored = function() {
  return this.parsed.name.match(/^\_/) !== null || this.outputDir === false;
};

Template.prototype.getMatter = function() {
  return matter(this.inputContent);
};

Template.prototype.getPreRender = function() {
  return this.frontMatter.content;
};

Template.prototype.getLayoutTemplate = function(name) {
  let path = new Layout(name, this.layoutsDir).getFullPath();
  return new Template(path, this.inputDir, this.outputDir);
};

Template.prototype.getFrontMatterData = function() {
  return this.frontMatter.data || {};
};

Template.prototype.getAllLayoutFrontMatterData = async function(
  tmpl,
  data,
  merged
) {
  if (!merged) {
    merged = data;
  }

  if (data[cfg.keys.layout]) {
    let layout = tmpl.getLayoutTemplate(data[cfg.keys.layout]);
    let layoutData = layout.getFrontMatterData();

    return this.getAllLayoutFrontMatterData(
      tmpl,
      layoutData,
      Object.assign({}, layoutData, merged)
    );
  }

  return merged;
};

Template.prototype.getLocalDataPath = function() {
  return this.parsed.dir + "/" + this.parsed.name + ".json";
};

Template.prototype.getData = async function(localData) {
  let data = {};

  if (this.templateData) {
    data = await this.templateData.getLocalData(this.getLocalDataPath());
  }

  let mergedLayoutData = await this.getAllLayoutFrontMatterData(
    this,
    this.getFrontMatterData()
  );

  return Object.assign(
    {},
    data,
    mergedLayoutData,
    localData,
    this.dataOverrides
  );
};

Template.prototype.renderLayout = async function(tmpl, tmplData) {
  let layoutName = tmplData[cfg.keys.layout];
  // TODO make layout key to be available to templates (without it causing issues with merge below)
  delete tmplData[cfg.keys.layout];

  let layout = this.getLayoutTemplate(layoutName);
  let layoutData = await layout.getData(tmplData);

  // console.log( await this.renderContent( tmpl.getPreRender(), tmplData ) );
  layoutData._layoutContent = await this.renderContent(
    tmpl.getPreRender(),
    tmplData
  );

  if (layoutData[cfg.keys.layout]) {
    return this.renderLayout(layout, layoutData);
  }

  return layout.renderContent(layout.getPreRender(), layoutData);
};

Template.prototype.getCompiledPromise = async function() {
  return this.templateRender.getCompiledTemplate(this.getPreRender());
};

Template.prototype.renderContent = async function(str, data) {
  return this.templateRender.render(str, data);
};

Template.prototype.render = async function(data) {
  if (!data) {
    data = await this.getData();
  }

  if (data[cfg.keys.layout]) {
    return this.renderLayout(this, data);
  } else {
    return this.renderContent(this.getPreRender(), data);
  }
};

Template.prototype.addFilter = function(callback) {
  this.filters.push(callback);
};

Template.prototype.runFilters = function(str) {
  this.filters.forEach(function(filter) {
    str = filter.call(this, str);
  });

  return str;
};

Template.prototype.addPlugin = function(key, callback) {
  this.plugins[key] = callback;
};

Template.prototype.removePlugin = function(key) {
  delete this.plugins[key];
};

Template.prototype.runPlugins = async function(data) {
  let ret = true;
  for (let key in this.plugins) {
    let pluginRet = await this.plugins[key].call(this, data);
    if (pluginRet === false) {
      ret = false;
    }
  }

  return ret;
};

Template.prototype.write = async function() {
  let outputPath = this.getOutputPath();
  if (this.isIgnored()) {
    console.log("Ignoring", outputPath);
  } else {
    let data = await this.getData();
    let str = await this.render(data);
    let pluginRet = await this.runPlugins(data);

    if (pluginRet) {
      let filtered = this.runFilters(str);
      await pify(fs.outputFile)(outputPath, filtered);
      console.log("Writing", outputPath, "from", this.inputPath);
    }
  }
};

Template.prototype.clone = function() {
  return new Template(
    this.inputPath,
    this.inputDir,
    this.outputDir,
    this.templateData
  );
};

module.exports = Template;
