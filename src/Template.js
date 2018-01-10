const pify = require("pify");
const fs = require("fs-extra");
const parsePath = require("parse-filepath");
const matter = require("gray-matter");
const normalize = require("normalize-path");
const _isObject = require("lodash.isobject");
const { DateTime } = require("luxon");
const TemplateRender = require("./TemplateRender");
const TemplatePath = require("./TemplatePath");
const TemplatePermalink = require("./TemplatePermalink");
const Layout = require("./TemplateLayout");
const Eleventy = require("./Eleventy");
const config = require("./Config");

class Template {
  constructor(path, inputDir, outputDir, templateData) {
    this.inputPath = path;
    this.inputContent = fs.readFileSync(path, "utf-8");
    this.parsed = parsePath(path);

    // for pagination
    this.extraOutputSubdirectory = "";

    if (inputDir) {
      this.inputDir = normalize(inputDir);
      this.layoutsDir = this.inputDir + "/" + config.dir.includes;
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

    this.isVerbose = true;
    this.writeCount = 0;
  }

  getInputPath() {
    return this.inputPath;
  }

  setIsVerbose(isVerbose) {
    this.isVerbose = isVerbose;
  }

  getTemplateSubfolder() {
    return TemplatePath.stripPathFromDir(this.parsed.dir, this.inputDir);
  }

  setExtraOutputSubdirectory(dir) {
    this.extraOutputSubdirectory = dir + "/";
  }

  // TODO instead of isHTMLIOException, do a global search to check if output path = input path and then add extra suffix
  async getOutputLink() {
    let permalink = this.getFrontMatterData()[config.keys.permalink];
    if (permalink) {
      let data = await this.getData();
      let perm = new TemplatePermalink(
        // render variables inside permalink front matter
        await this.renderContent(permalink, data, {
          bypassMarkdown: true
        }),
        this.extraOutputSubdirectory
      );
      return perm.toString();
    }

    return TemplatePermalink.generate(
      this.getTemplateSubfolder(),
      this.parsed.name,
      this.extraOutputSubdirectory,
      this.isHtmlIOException ? config.htmlOutputSuffix : ""
    ).toString();
  }

  // TODO check for conflicts, see if file already exists?
  async getOutputPath() {
    let uri = await this.getOutputLink();
    if (this.getFrontMatterData()[config.keys.permalinkRoot]) {
      return normalize(uri);
    } else {
      return normalize(this.outputDir + "/" + uri);
    }
  }

  setDataOverrides(overrides) {
    this.dataOverrides = overrides;
  }

  isIgnored() {
    return this.outputDir === false;
  }

  getMatter() {
    return matter(this.inputContent);
  }

  getPreRender() {
    return this.frontMatter.content;
  }

  getLayoutTemplate(name) {
    let path = new Layout(name, this.layoutsDir).getFullPath();
    return new Template(path, this.inputDir, this.outputDir);
  }

  getFrontMatterData() {
    return this.frontMatter.data || {};
  }

  async getAllLayoutFrontMatterData(tmpl, data, merged) {
    if (!merged) {
      merged = data;
    }

    if (data[config.keys.layout]) {
      let layout = tmpl.getLayoutTemplate(data[config.keys.layout]);
      let layoutData = layout.getFrontMatterData();

      return this.getAllLayoutFrontMatterData(
        tmpl,
        layoutData,
        Object.assign({}, layoutData, merged)
      );
    }

    return merged;
  }

  getLocalDataPath() {
    return this.parsed.dir + "/" + this.parsed.name + ".json";
  }

  async mapDataAsRenderedTemplates(data, templateData) {
    if (Array.isArray(data)) {
      let arr = [];
      for (let j = 0, k = data.length; j < k; j++) {
        arr.push(await this.mapDataAsRenderedTemplates(data[j], templateData));
      }
      return arr;
    } else if (_isObject(data)) {
      let obj = {};
      for (let value in data) {
        obj[value] = await this.mapDataAsRenderedTemplates(
          data[value],
          templateData
        );
      }
      return obj;
    } else if (typeof data === "string") {
      let str = await this.renderContent(data, templateData);
      return str;
    }

    return data;
  }

  async getData(localData) {
    let data = {};

    if (this.templateData) {
      data = await this.templateData.getLocalData(this.getLocalDataPath());
    }

    let mergedLocalData = Object.assign({}, localData, this.dataOverrides);

    let frontMatterData = this.getFrontMatterData();

    let mergedLayoutData = await this.getAllLayoutFrontMatterData(
      this,
      frontMatterData
    );

    return Object.assign({}, data, mergedLayoutData, mergedLocalData);
  }

  async getRenderedData() {
    let data = await this.getData();
    if (data.renderData) {
      data.renderData = await this.mapDataAsRenderedTemplates(
        data.renderData,
        data
      );
    }
    return data;
  }

  async renderLayout(tmpl, tmplData) {
    let layoutName = tmplData[config.keys.layout];
    // TODO make layout key to be available to templates (without it causing issues with merge below)
    delete tmplData[config.keys.layout];

    let layout = this.getLayoutTemplate(layoutName);
    let layoutData = await layout.getData(tmplData);

    // console.log( await this.renderContent( tmpl.getPreRender(), tmplData ) );
    let layoutContent = await this.renderContent(tmpl.getPreRender(), tmplData);
    layoutData.content = layoutContent;
    // Deprecated
    layoutData._layoutContent = layoutContent;

    if (layoutData[config.keys.layout]) {
      return this.renderLayout(layout, layoutData);
    }

    return layout.renderContent(layout.getPreRender(), layoutData);
  }

  async getCompiledPromise() {
    return this.templateRender.getCompiledTemplate(this.getPreRender());
  }

  async renderContent(str, data, options) {
    let fn = await this.templateRender.getCompiledTemplate(str, options);
    return fn(data);
  }

  async render(data) {
    if (!data) {
      data = await this.getRenderedData();
    }

    if (data[config.keys.layout]) {
      return this.renderLayout(this, data);
    } else {
      return this.renderContent(this.getPreRender(), data);
    }
  }

  addFilter(callback) {
    this.filters.push(callback);
  }

  async runFilters(str) {
    let outputPath = await this.getOutputPath();
    this.filters.forEach(function(filter) {
      str = filter.call(this, str, outputPath);
    });

    return str;
  }

  addPlugin(key, callback) {
    this.plugins[key] = callback;
  }

  removePlugin(key) {
    delete this.plugins[key];
  }

  async runPlugins(data) {
    let ret = true;
    for (let key in this.plugins) {
      let pluginRet = await this.plugins[key].call(this, data);
      if (pluginRet === false) {
        ret = false;
      }
    }

    return ret;
  }

  async writeWithData(outputPath, data) {
    if (this.isIgnored()) {
      if (this.isVerbose) {
        console.log("Ignoring", outputPath);
      }
    } else {
      this.writeCount++;

      let pluginRet = await this.runPlugins(data);
      if (pluginRet) {
        let str = await this.render(data);
        let filtered = await this.runFilters(str);
        await pify(fs.outputFile)(outputPath, filtered);

        if (this.isVerbose) {
          console.log("Writing", outputPath, "from", this.inputPath);
        }
      }
    }
  }

  async write() {
    let outputPath = await this.getOutputPath();
    let data = await this.getRenderedData();
    await this.writeWithData(outputPath, data);
  }

  clone() {
    // TODO better clone
    let tmpl = new Template(
      this.inputPath,
      this.inputDir,
      this.outputDir,
      this.templateData
    );
    tmpl.setIsVerbose(this.isVerbose);
    return tmpl;
  }

  getWriteCount() {
    return this.writeCount;
  }

  async getMappedDate(data) {
    let stat = await pify(fs.stat)(this.inputPath);

    // should we use Luxon dates everywhere? Right now using built-in `Date`
    if ("date" in data) {
      if (data.date instanceof Date) {
        // YAML does its own date parsing
        return data.date;
      } else {
        // string
        if (data.date.toLowerCase() === "last modified") {
          return new Date(stat.ctimeMs);
        } else if (data.date.toLowerCase() === "created") {
          return new Date(stat.birthtimeMs);
        } else {
          // try to parse with Luxon
          let date = DateTime.fromISO(data.date, { zone: "utc" });
          if (!date.isValid) {
            throw new Error(
              `date front matter value (${data.date}) is invalid for ${
                this.inputPath
              }`
            );
          }

          return date.toJSDate();
        }
      }
    } else {
      // CREATED
      return new Date(stat.birthtimeMs);
    }

    return date;
  }

  async getMapped() {
    let outputPath = await this.getOutputPath();
    let url = await this.getOutputLink();
    let data = await this.getRenderedData();
    let map = {
      template: this,
      inputPath: this.getInputPath(),
      outputPath: outputPath,
      url: url,
      data: data
    };

    map.date = await this.getMappedDate(data);

    return map;
  }
}

module.exports = Template;
