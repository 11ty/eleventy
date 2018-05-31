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
const TemplateFileSlug = require("./TemplateFileSlug");
const templateCache = require("./TemplateCache");
const Pagination = require("./Plugins/Pagination");
const config = require("./Config");
const debug = require("debug")("Eleventy:Template");
const debugDev = require("debug")("Dev:Eleventy:Template");

class Template {
  constructor(path, inputDir, outputDir, templateData) {
    debugDev("new Template(%o)", path);

    this.config = config.getConfig();
    this.inputPath = path;
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

    this.transforms = [];
    this.plugins = {};
    this.templateData = templateData;
    if (this.templateData) {
      this.templateData.setInputDir(this.inputDir);
    }
    this.dataOverrides = {};

    this.templateRender = new TemplateRender(this.inputPath, this.inputDir);

    // HTML output can’t overwrite the HTML input file.
    this.isHtmlIOException =
      this.inputDir === this.outputDir &&
      this.templateRender.isEngine("html") &&
      this.parsed.name === "index";

    this.isVerbose = true;
    this.isDryRun = false;
    this.writeCount = 0;
    this.initialLayout = undefined;
    this.wrapWithLayouts = true;
    this.fileSlug = new TemplateFileSlug(this.inputPath, this.inputDir);
  }

  setIsVerbose(isVerbose) {
    this.isVerbose = isVerbose;
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;
  }

  setWrapWithLayouts(wrap) {
    this.wrapWithLayouts = wrap;
  }

  setExtraOutputSubdirectory(dir) {
    this.extraOutputSubdirectory = dir + "/";
  }

  getInputPath() {
    return this.inputPath;
  }

  getTemplateSubfolder() {
    return TemplatePath.stripPathFromDir(this.parsed.dir, this.inputDir);
  }

  async _getLink(data) {
    if (!data) {
      data = await this.getData();
    }

    let permalink = data[this.config.keys.permalink];
    if (permalink) {
      // render variables inside permalink front matter, bypass markdown
      let permalinkValue;
      if (!this.config.dynamicPermalinks || data.dynamicPermalink === true) {
        debugDev("Not using dynamicPermalinks, using %o", permalink);
        permalinkValue = permalink;
      } else {
        permalinkValue = await this.renderContent(permalink, data, true);
        debug(
          "Rendering permalink for %o: %s becomes %o",
          this.inputPath,
          permalink,
          permalinkValue
        );
        debugDev("Permalink rendered with data: %o", data);
      }

      let perm = new TemplatePermalink(
        permalinkValue,
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
  async getOutputLink(data) {
    let link = await this._getLink(data);
    return link.toString();
  }

  async getOutputHref(data) {
    let link = await this._getLink(data);
    return link.toHref();
  }

  // TODO check for conflicts, see if file already exists?
  async getOutputPath(data) {
    let uri = await this.getOutputLink(data);
    if ((await this.getFrontMatterData())[this.config.keys.permalinkRoot]) {
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

  async read() {
    this.inputContent = await this.getInputContent();
    this.frontMatter = matter(this.inputContent);
  }

  async getInputContent() {
    return fs.readFile(this.inputPath, "utf-8");
  }

  async getPreRender() {
    if (!this.frontMatter) {
      await this.read();
    }

    return this.frontMatter.content;
  }

  async getFrontMatter() {
    if (!this.frontMatter) {
      await this.read();
    }

    return this.frontMatter;
  }

  async getFrontMatterData() {
    if (!this.frontMatter) {
      await this.read();
    }

    return this.frontMatter.data || {};
  }

  getLayoutTemplateFilePath(layoutPath) {
    return new TemplateLayout(layoutPath, this.layoutsDir).getFullPath();
  }

  getLayoutTemplate(path) {
    if (templateCache.has(path)) {
      debugDev("Found %o in TemplateCache", path);
      return templateCache.get(path);
    }

    let tmpl = new Template(path, this.inputDir, this.outputDir);
    templateCache.add(path, tmpl);

    return tmpl;
  }

  async getAllLayoutFrontMatterData(tmpl, data, merged) {
    debugDev("%o getAllLayoutFrontMatterData", this.inputPath);

    if (!merged) {
      merged = data;
    }

    if (data[this.config.keys.layout]) {
      let layoutFilePath = tmpl.getLayoutTemplateFilePath(
        data[this.config.keys.layout]
      );
      let layout = tmpl.getLayoutTemplate(layoutFilePath);
      let layoutData = await layout.getFrontMatterData();

      return this.getAllLayoutFrontMatterData(
        tmpl,
        layoutData,
        Object.assign({}, layoutData, merged)
      );
    }

    return merged;
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
      // bypassMarkdown
      let str = await this.renderContent(data, templateData, true);
      return str;
    }

    return data;
  }

  setDataCache(data) {
    this.dataCache = data;
  }

  getDataCache() {
    return this.dataCache;
  }

  async getData(localData) {
    if (!this.dataCache) {
      debugDev("%o getData()", this.inputPath);
      let data = {};

      if (this.templateData) {
        data = await this.templateData.getLocalData(this.inputPath);
      }

      let frontMatterData = await this.getFrontMatterData();

      let mergedLayoutData = await this.getAllLayoutFrontMatterData(
        this,
        frontMatterData
      );

      let mergedData = Object.assign({}, data, mergedLayoutData);
      mergedData = await this.addPageDate(mergedData);
      mergedData = this.addPageData(mergedData);

      this.dataCache = mergedData;
    }

    return Object.assign({}, this.dataCache, localData, this.dataOverrides);
  }

  async addPageDate(data) {
    if (!("page" in data)) {
      data.page = {};
    }

    let newDate = await this.getMappedDate(data);

    if ("page" in data && "date" in data.page) {
      debug(
        "Warning: data.page.date is in use (%o) will be overwritten with: %o",
        data.page.date,
        newDate
      );
    }

    data.page.date = newDate;

    return data;
  }

  addPageData(data) {
    if (!("page" in data)) {
      data.page = {};
    }

    data.page.inputPath = this.inputPath;
    data.page.fileSlug = this.fileSlug.getSlug();

    return data;
  }

  async addPageRenderedData(data) {
    if (!("page" in data)) {
      data.page = {};
    }

    let newUrl = await this.getOutputHref(data);
    if ("page" in data && "url" in data.page) {
      if (data.page.url !== newUrl) {
        debug(
          "Warning: data.page.url is in use (%o) will be overwritten with: %o",
          data.page.url,
          newUrl
        );
      }
    }

    data.page.url = newUrl;
    data.page.outputPath = await this.getOutputPath(data);

    return data;
  }

  // getData (with renderData and page.url added)
  async getRenderedData() {
    let data = await this.getData();
    data = await this.addPageRenderedData(data);

    if (data.renderData) {
      data.renderData = await this.mapDataAsRenderedTemplates(
        data.renderData,
        data
      );
    }
    return data;
  }

  async renderLayout(tmpl, tmplData, forcedLayoutPath) {
    let layoutPath = forcedLayoutPath || tmplData[tmpl.config.keys.layout];
    debugDev("renderLayout(%o): %o", tmpl.inputPath, layoutPath);

    if (!this.initialLayout) {
      this.initialLayout = tmplData[tmpl.config.keys.layout];
      debugDev(
        "No layout name saved, saving: %o for %o",
        this.initialLayout,
        this.inputPath
      );
    }

    // TODO make layout key to be available to templates (without it causing issues with merge below)
    delete tmplData[tmpl.config.keys.layout];
    debugDev(
      "Layout deleted from data (%o): %o",
      tmpl.config.keys.layout,
      tmplData[tmpl.config.keys.layout]
    );

    let layoutFilePath = tmpl.getLayoutTemplateFilePath(layoutPath);
    let layout = tmpl.getLayoutTemplate(layoutFilePath);
    debug(
      "%o is using layout %o: %o",
      this.inputPath,
      layoutPath,
      layoutFilePath
    );

    let layoutData = await layout.getData(tmplData);
    // debug("layoutData: %O", layoutData)
    // debug("tmplData (passed to layoutContent = renderContent(): %O", tmplData);
    // debug("renderLayout -> renderContent(%o)", await tmpl.getPreRender());
    let layoutContent = await tmpl.renderContent(
      await tmpl.getPreRender(),
      tmplData
    );
    // debug("renderLayout -> layoutContent %o", layoutContent);

    layoutData.content = layoutContent;
    layoutData.layoutContent = layoutContent;
    // Deprecated
    layoutData._layoutContent = layoutContent;

    // don’t propagate engine overrides to layout render
    delete layoutData[tmpl.config.keys.engineOverride];

    if (layoutData[tmpl.config.keys.layout]) {
      debugDev(
        "renderLayout found another layout %o (%o)",
        layoutData[tmpl.config.keys.layout],
        this.inputPath
      );
      return tmpl.renderLayout(layout, layoutData);
    }

    return layout.renderContent(await layout.getPreRender(), layoutData);
  }

  async renderContent(str, data, bypassMarkdown) {
    // TODO test for layouts and overrides
    if (this.config.keys.engineOverride in data) {
      debugDev(
        "%o overriding template engine to use %o",
        this.inputPath,
        data[this.config.keys.engineOverride]
      );

      this.templateRender.setEngineOverride(
        data[this.config.keys.engineOverride],
        bypassMarkdown
      );
    } else {
      this.templateRender.setUseMarkdown(!bypassMarkdown);
    }

    debugDev(
      "%o renderContent() using engine: %o",
      this.inputPath,
      this.templateRender.engineName
    );

    let fn = await this.templateRender.getCompiledTemplate(str);
    let rendered = fn(data);
    return rendered;
  }

  async _testRenderWithoutLayouts(data) {
    this.setWrapWithLayouts(false);
    let ret = await this.render(data);
    this.setWrapWithLayouts(true);
    return ret;
  }

  async render(data) {
    debugDev("%o render()", this.inputPath);
    if (!data) {
      data = await this.getRenderedData();
    }

    if (
      !this.wrapWithLayouts &&
      (data[this.config.keys.layout] || this.initialLayout)
    ) {
      debugDev("Template.render is bypassing layouts for %o.", this.inputPath);
    }

    if (
      this.wrapWithLayouts &&
      (data[this.config.keys.layout] || this.initialLayout)
    ) {
      if (data[this.config.keys.layout]) {
        debugDev(
          "Template.render found layout: %o",
          data[this.config.keys.layout]
        );
      } else {
        debugDev("Template.render found initialLayout: %o", this.initialLayout);
      }
      return this.renderLayout(this, data, this.initialLayout);
    } else {
      debugDev("Template.render renderContent for %o", this.inputPath);
      return this.renderContent(await this.getPreRender(), data);
    }
  }

  addTransform(callback) {
    this.transforms.push(callback);
  }

  async runTransforms(str, outputPath) {
    this.transforms.forEach(function(filter) {
      str = filter.call(this, str, outputPath);
    });

    return str;
  }

  async getTemplates(data) {
    // TODO cache this result
    let results = [];

    if (!Pagination.hasPagination(data)) {
      data.page.url = await this.getOutputHref(data);
      data.page.outputPath = await this.getOutputPath(data);

      results.push({
        template: this,
        inputPath: this.inputPath,
        data: data,
        date: data.page.date,
        outputPath: data.page.outputPath,
        url: data.page.url
      });
    } else {
      // needs collections for pagination items
      // but individual pagination entries won’t be part of a collection
      this.paging = new Pagination(data);
      this.paging.setTemplate(this);
      let templates = await this.paging.getPageTemplates();
      for (let page of templates) {
        let pageData = await page.getRenderedData();

        // Issue #115
        if (data.collections) {
          pageData.collections = data.collections;
        }

        // TODO try to reuse data instead of a new copy
        // let pageData = this.augmentDataWithRenderedContent(data);
        results.push({
          template: page,
          inputPath: this.inputPath,
          data: pageData,
          date: data.page.date,
          outputPath: await page.getOutputPath(pageData),
          url: await page.getOutputHref(pageData)
        });
      }
    }

    return results;
  }

  async getRenderedTemplates(data) {
    let pages = await this.getTemplates(data);
    for (let page of pages) {
      page.templateContent = await page.template._getContent(
        page.outputPath,
        page.data
      );
    }
    return pages;
  }

  async _getContent(outputPath, data) {
    let str = await this.render(data);
    let filtered = await this.runTransforms(str, outputPath);
    return filtered;
  }

  async _write(outputPath, finalContent) {
    this.writeCount++;

    if (!this.isDryRun) {
      await fs.outputFile(outputPath, finalContent);
    }

    let writeDesc = this.isDryRun ? "Pretending to write" : "Writing";
    if (this.isVerbose) {
      console.log(`${writeDesc} ${outputPath} from ${this.inputPath}.`);
    } else {
      debug(`${writeDesc} %o from %o.`, outputPath, this.inputPath);
    }
  }

  async write(outputPath, data) {
    let templates = await this.getRenderedTemplates(data);
    for (let tmpl of templates) {
      await this._write(tmpl.outputPath, tmpl.templateContent);
    }
  }

  // TODO this but better
  clone() {
    let tmpl = new Template(
      this.inputPath,
      this.inputDir,
      this.outputDir,
      this.templateData
    );

    // let newData = Object.assign({}, this.getDataCache());
    // delete newData.page.url;
    // tmpl.setDataCache(newData);

    tmpl.setIsVerbose(this.isVerbose);
    tmpl.setDryRun(this.isDryRun);

    return tmpl;
  }

  getWriteCount() {
    return this.writeCount;
  }

  async getMappedDate(data) {
    // should we use Luxon dates everywhere? Right now using built-in `Date`
    if ("date" in data) {
      debug(
        "getMappedDate: using a date in the data for %o of %o",
        this.inputPath,
        data.date
      );
      if (data.date instanceof Date) {
        // YAML does its own date parsing
        debug("getMappedDate: YAML parsed it: %o", data.date);
        return data.date;
      } else {
        let stat = await fs.stat(this.inputPath);
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
          debug(
            "getMappedDate: Luxon parsed %o: %o and %o",
            data.date,
            date,
            date.toJSDate()
          );

          return date.toJSDate();
        }
      }
    } else {
      let filenameRegex = this.inputPath.match(/(\d{4}-\d{2}-\d{2})/);
      if (filenameRegex !== null) {
        let dateObj = DateTime.fromISO(filenameRegex[1]).toJSDate();
        debug(
          "getMappedDate: using filename regex time for %o of %o: %o",
          this.inputPath,
          filenameRegex[1],
          dateObj
        );
        return dateObj;
      }

      let stat = await fs.stat(this.inputPath);
      let createdDate = new Date(stat.birthtimeMs);
      debug(
        "getMappedDate: using file created time for %o of %o",
        this.inputPath,
        createdDate
      );

      // CREATED
      return createdDate;
    }
  }

  async getInitialMapEntry() {
    let data = await this.getData();

    // does not return outputPath or url, we don’t want to render permalinks yet
    return {
      template: this,
      inputPath: this.inputPath,
      data: data,
      date: data.page.date
    };
  }

  async getSecondaryMapEntry(data) {
    this.setWrapWithLayouts(false);
    let mapEntry = (await this.getRenderedTemplates(data))[0];
    this.setWrapWithLayouts(true);

    return {
      outputPath: mapEntry.outputPath,
      url: mapEntry.url,
      templateContent: mapEntry.templateContent
    };
  }

  async getMapped() {
    debugDev("%o getMapped()", this.inputPath);
    return await this.getInitialMapEntry();
  }
}

module.exports = Template;
