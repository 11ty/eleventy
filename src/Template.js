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
const TemplateLayout = require("./TemplateLayout");
const Eleventy = require("./Eleventy");
const config = require("./Config");
const debug = require("debug")("Eleventy:Template");

class Template {
  constructor(path, inputDir, outputDir, templateData) {
    this.config = config.getConfig();
    this.inputPath = path;
    this.inputContent = fs.readFileSync(path, "utf-8");
    this.parsed = parsePath(path);

    // for pagination
    this.extraOutputSubdirectory = "";

    if (inputDir) {
      this.inputDir = normalize(inputDir);
      this.layoutsDir = this.inputDir + "/" + this.config.dir.includes;
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
    this.initialLayout = undefined;
    this.wrapWithLayouts = true;
  }

  getInputPath() {
    return this.inputPath;
  }

  setIsVerbose(isVerbose) {
    this.isVerbose = isVerbose;
  }

  setWrapWithLayouts(wrap) {
    this.wrapWithLayouts = wrap;
  }

  getTemplateSubfolder() {
    return TemplatePath.stripPathFromDir(this.parsed.dir, this.inputDir);
  }

  setExtraOutputSubdirectory(dir) {
    this.extraOutputSubdirectory = dir + "/";
  }

  async _getLink() {
    let permalink = this.getFrontMatterData()[this.config.keys.permalink];
    if (permalink) {
      let data = await this.getData();
      // debug("Rendering permalink for %o", this.inputPath);
      let perm = new TemplatePermalink(
        // render variables inside permalink front matter
        await this.renderContent(permalink, data, {
          bypassMarkdown: true
        }),
        this.extraOutputSubdirectory
      );
      return perm;
    }

    return TemplatePermalink.generate(
      this.getTemplateSubfolder(),
      this.parsed.name,
      this.extraOutputSubdirectory,
      this.isHtmlIOException ? this.config.htmlOutputSuffix : ""
    );
  }

  // TODO instead of isHTMLIOException, do a global search to check if output path = input path and then add extra suffix
  async getOutputLink() {
    let link = await this._getLink();
    return link.toString();
  }

  async getOutputHref() {
    let link = await this._getLink();
    return link.toHref();
  }

  // TODO check for conflicts, see if file already exists?
  async getOutputPath() {
    let uri = await this.getOutputLink();
    if (this.getFrontMatterData()[this.config.keys.permalinkRoot]) {
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

  getLayoutTemplate(layoutPath) {
    let path = new TemplateLayout(layoutPath, this.layoutsDir).getFullPath();
    // debug(
    //   "creating new Template %o in getLayoutTemplate for %o",
    //   path,
    //   this.inputPath
    // );
    return new Template(path, this.inputDir, this.outputDir);
  }

  getFrontMatterData() {
    return this.frontMatter.data || {};
  }

  async getAllLayoutFrontMatterData(tmpl, data, merged) {
    if (!merged) {
      merged = data;
    }

    if (data[this.config.keys.layout]) {
      let layout = tmpl.getLayoutTemplate(data[this.config.keys.layout]);
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
      debug("rendering data.renderData for %o", this.inputPath);
      let str = await this.renderContent(data, templateData, {
        bypassMarkdown: true
      });
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

  async addPageUrlToData(data) {
    if ("page" in data && "url" in data.page) {
      debug(
        "Warning: data.page.url is in use by the application will be overwritten: %o",
        data.page.url
      );
    }
    if (!("page" in data)) {
      data.page = {};
    }
    data.page.url = await this.getOutputHref();
  }

  // getData (with renderData and page.url added)
  async getRenderedData() {
    let data = await this.getData();
    await this.addPageUrlToData(data);

    if (data.renderData) {
      data.renderData = await this.mapDataAsRenderedTemplates(
        data.renderData,
        data
      );
    }
    return data;
  }

  async renderLayout(tmpl, tmplData, forcedLayoutPath) {
    // debug(`${tmpl.inputPath} renderLayout()`);
    let layoutPath = forcedLayoutPath || tmplData[tmpl.config.keys.layout];
    // debug("Template %o is using layout: %o", this.inputPath, layoutPath);

    if (!this.initialLayout) {
      this.initialLayout = tmplData[tmpl.config.keys.layout];
      // debug("Saved layout: %o for %o", this.initialLayout, this.inputPath);
    }
    // TODO make layout key to be available to templates (without it causing issues with merge below)
    delete tmplData[tmpl.config.keys.layout];

    let layout = tmpl.getLayoutTemplate(layoutPath);
    let layoutData = await layout.getData(tmplData);
    // debug("layoutData: %O", layoutData)
    // debug("tmplData (passed to layoutContent = renderContent(): %O", tmplData);
    // debug("renderLayout -> renderContent(%o)", tmpl.getPreRender());
    let layoutContent = await tmpl.renderContent(tmpl.getPreRender(), tmplData);
    // debug("renderLayout -> layoutContent %o", layoutContent);
    layoutData.content = layoutContent;
    layoutData.layoutContent = layoutContent;
    // Deprecated
    layoutData._layoutContent = layoutContent;

    if (layoutData[tmpl.config.keys.layout]) {
      debug(
        "renderLayout found another layout %o",
        layoutData[tmpl.config.keys.layout]
      );
      return tmpl.renderLayout(layout, layoutData);
    }

    return layout.renderContent(layout.getPreRender(), layoutData);
  }

  async getCompiledPromise() {
    return this.templateRender.getCompiledTemplate(this.getPreRender());
  }

  async renderContent(str, data, options) {
    debug(
      `${this.inputPath} renderContent() using ${
        this.templateRender.engineName
      }`
    );

    // if (data.layoutContent) {
    //   debug("renderContent -> layoutContent %o", data.layoutContent);
    // }
    let fn = await this.templateRender.getCompiledTemplate(str, options);
    return fn(data);
  }

  async renderWithoutLayouts(data) {
    this.setWrapWithLayouts(false);
    let ret = await this.render(data);
    this.setWrapWithLayouts(true);
    return ret;
  }

  async render(data) {
    // debug(`${this.inputPath} render()`);
    if (!data) {
      data = await this.getRenderedData();
    }

    if (!this.wrapWithLayouts) {
      debug(
        "Template.render is bypassing wrapping content in layouts for %o.",
        this.inputPath
      );
    }

    if (
      this.wrapWithLayouts &&
      (data[this.config.keys.layout] || this.initialLayout)
    ) {
      return this.renderLayout(this, data, this.initialLayout);
    } else {
      // debug("Template.render renderContent for %o", this.inputPath);
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

  async getFinalContent(data) {
    let pluginRet = await this.runPlugins(data);
    if (pluginRet) {
      let str = await this.render(data);
      let filtered = await this.runFilters(str);
      return filtered;
    }

    return undefined;
  }

  async writeWithData(outputPath, data) {
    let finalContent = await this.getFinalContent(data);
    if (finalContent !== undefined) {
      //       debug(`Template.writeWithData: ${outputPath}
      // ${finalContent}`);
      this.writeCount++;
      await pify(fs.outputFile)(outputPath, finalContent);

      if (this.isVerbose) {
        console.log(`Writing ${outputPath} from ${this.inputPath}.`);
      } else {
        debug(`Writing ${outputPath} from ${this.inputPath}.`);
      }
    } else {
      debug(
        `Did not write ${outputPath} because writing was canceled by a plugin.`
      );
    }
  }

  async write() {
    let outputPath = await this.getOutputPath();

    if (!this.isIgnored()) {
      let data = await this.getRenderedData();
      await this.writeWithData(outputPath, data);
    } else {
      debug(`Ignoring ${outputPath}.`);
    }
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
      let filenameRegex = this.inputPath.match(/(\d{4}-\d{2}-\d{2})/);
      if (filenameRegex !== null) {
        return DateTime.fromISO(filenameRegex[1]).toJSDate();
      }

      // CREATED
      return new Date(stat.birthtimeMs);
    }

    return date;
  }

  async isEqual(compareTo) {
    return (
      compareTo.getInputPath() === this.getInputPath() &&
      (await compareTo.getOutputPath()) === (await this.getOutputPath())
    );
  }

  async getMapped() {
    let outputPath = await this.getOutputPath();
    let url = await this.getOutputHref();
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
