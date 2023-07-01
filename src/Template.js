const fs = require("graceful-fs");
const util = require("util");
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);

const os = require("os");
const path = require("path");
const normalize = require("normalize-path");
const { set: lodashSet, get: lodashGet } = require("@11ty/lodash-custom");
const { DateTime } = require("luxon");
const { TemplatePath, isPlainObject } = require("@11ty/eleventy-utils");

const ConsoleLogger = require("./Util/ConsoleLogger");
const getDateFromGitLastUpdated = require("./Util/DateGitLastUpdated");
const getDateFromGitFirstAdded = require("./Util/DateGitFirstAdded");

const TemplateData = require("./TemplateData");
const TemplateContent = require("./TemplateContent");
const TemplatePermalink = require("./TemplatePermalink");
const TemplateLayout = require("./TemplateLayout");
const TemplateFileSlug = require("./TemplateFileSlug");
const ComputedData = require("./ComputedData");
const Pagination = require("./Plugins/Pagination");
const TemplateBehavior = require("./TemplateBehavior");

const TemplateContentPrematureUseError = require("./Errors/TemplateContentPrematureUseError");
const TemplateContentUnrenderedTemplateError = require("./Errors/TemplateContentUnrenderedTemplateError");

const EleventyBaseError = require("./EleventyBaseError");
class EleventyTransformError extends EleventyBaseError {}

const debug = require("debug")("Eleventy:Template");
const debugDev = require("debug")("Dev:Eleventy:Template");

class Template extends TemplateContent {
  constructor(templatePath, inputDir, outputDir, templateData, extensionMap, config) {
    debugDev("new Template(%o)", templatePath);
    super(templatePath, inputDir, config);

    this.parsed = path.parse(templatePath);

    // for pagination
    this.extraOutputSubdirectory = "";

    if (outputDir) {
      this.outputDir = normalize(outputDir);
    } else {
      this.outputDir = false;
    }

    this.extensionMap = extensionMap;

    this.linters = [];
    this.transforms = [];

    this.setTemplateData(templateData);

    this.isVerbose = true;
    this.isDryRun = false;
    this.writeCount = 0;

    this.fileSlug = new TemplateFileSlug(this.inputPath, this.inputDir, this.extensionMap);
    this.fileSlugStr = this.fileSlug.getSlug();
    this.filePathStem = this.fileSlug.getFullPathWithoutExtension();

    this.outputFormat = "fs";

    this.behavior = new TemplateBehavior(this.config);
    this.behavior.setOutputFormat(this.outputFormat);

    this.serverlessUrls = null;
  }

  setTemplateData(templateData) {
    this.templateData = templateData;
    if (this.templateData) {
      this.templateData.setInputDir(this.inputDir);
    }
  }

  get logger() {
    if (!this._logger) {
      this._logger = new ConsoleLogger();
      this._logger.isVerbose = this.isVerbose;
    }
    return this._logger;
  }

  /* Setter for Logger */
  set logger(logger) {
    this._logger = logger;
  }

  setRenderableOverride(renderableOverride) {
    this.behavior.setRenderableOverride(renderableOverride);
  }

  reset() {
    this.writeCount = 0;
  }

  resetCaches(types) {
    types = this.getResetTypes(types);

    super.resetCaches(types);

    if (types.data) {
      delete this._dataCache;
    }

    if (types.render) {
      delete this._cacheRenderedContent;
      delete this._cacheFinalContent;
    }
  }

  setOutputFormat(to) {
    this.outputFormat = to;
    this.behavior.setOutputFormat(to);
  }

  setIsVerbose(isVerbose) {
    this.isVerbose = isVerbose;
    this.logger.isVerbose = isVerbose;
  }

  setDryRunViaIncremental() {
    this.isDryRun = true;
    this.isIncremental = true;
  }

  setDryRun(isDryRun) {
    this.isDryRun = !!isDryRun;
  }

  setExtraOutputSubdirectory(dir) {
    this.extraOutputSubdirectory = dir + "/";
  }

  getTemplateSubfolder() {
    return TemplatePath.stripLeadingSubPath(this.parsed.dir, this.inputDir);
  }

  getLayout(layoutKey) {
    // already cached downstream in TemplateLayout -> TemplateCache
    return TemplateLayout.getTemplate(
      layoutKey,
      this.getInputDir(),
      this.eleventyConfig,
      this.extensionMap
    );
  }

  get baseFile() {
    return this.extensionMap.removeTemplateExtension(this.parsed.base);
  }

  get htmlIOException() {
    // HTML output can’t overwrite the HTML input file.
    return (
      this.inputDir === this.outputDir &&
      this.templateRender.isEngine("html") &&
      this.baseFile === "index"
    );
  }

  getServerlessUrls() {
    if (!this.serverlessUrls) {
      throw new Error(
        "Permalink has not yet processed. Calls to Template->getServerlessUrls not yet allowed."
      );
    }
    return this.serverlessUrls;
  }

  async initServerlessUrlsForEmptyPaginationTemplates(permalinkValue) {
    if (isPlainObject(permalinkValue)) {
      let buildlessPermalink = Object.assign({}, permalinkValue);
      delete buildlessPermalink.build;

      if (Object.keys(buildlessPermalink).length) {
        return this._getRawPermalinkInstance(buildlessPermalink);
      }
    }
  }

  async _getRawPermalinkInstance(permalinkValue) {
    let perm = new TemplatePermalink(permalinkValue, this.extraOutputSubdirectory);
    perm.setUrlTransforms(this.config.urlTransforms);

    if (this.templateData) {
      perm.setServerlessPathData(await this.templateData.getServerlessPathData());
    }
    this.behavior.setFromPermalink(perm);
    this.serverlessUrls = perm.getServerlessUrls();

    return perm;
  }

  async _getLink(data) {
    if (!data) {
      throw new Error("data argument missing in Template->_getLink");
    }

    let permalink = data[this.config.keys.permalink];
    let permalinkValue;

    // `permalink: false` means render but no file system write, e.g. use in collections only)
    // `permalink: true` throws an error
    if (typeof permalink === "boolean") {
      debugDev("Using boolean permalink %o", permalink);
      permalinkValue = permalink;
    } else if (permalink && (!this.config.dynamicPermalinks || data.dynamicPermalink === false)) {
      debugDev("Not using dynamic permalinks, using %o", permalink);
      permalinkValue = permalink;
    } else if (isPlainObject(permalink)) {
      // Empty permalink {} object should act as if no permalink was set at all
      // and inherit the default behavior
      let isEmptyObject = Object.keys(permalink).length === 0;
      if (!isEmptyObject) {
        let promises = [];
        let keys = [];
        for (let key in permalink) {
          keys.push(key);
          if (key !== "build" && Array.isArray(permalink[key])) {
            promises.push(
              Promise.all([...permalink[key]].map((entry) => super.renderPermalink(entry, data)))
            );
          } else {
            promises.push(super.renderPermalink(permalink[key], data));
          }
        }

        let results = await Promise.all(promises);

        permalinkValue = {};
        for (let j = 0, k = keys.length; j < k; j++) {
          let key = keys[j];
          permalinkValue[key] = results[j];
          debug(
            "Rendering permalink.%o for %o: %s becomes %o",
            key,
            this.inputPath,
            permalink[key],
            results[j]
          );
        }
      }
    } else if (permalink) {
      // render variables inside permalink front matter, bypass markdown
      permalinkValue = await super.renderPermalink(permalink, data);
      debug("Rendering permalink for %o: %s becomes %o", this.inputPath, permalink, permalinkValue);
      debugDev("Permalink rendered with data: %o", data);
    }

    // Override default permalink behavior. Only do this if permalink was _not_ in the data cascade
    if (!permalink && this.config.dynamicPermalinks && data.dynamicPermalink !== false) {
      let permalinkCompilation = this.engine.permalinkNeedsCompilation("");
      if (typeof permalinkCompilation === "function") {
        let ret = await this._renderFunction(permalinkCompilation, permalinkValue, this.inputPath);
        if (ret !== undefined) {
          if (typeof ret === "function") {
            // function
            permalinkValue = await this._renderFunction(ret, data);
          } else {
            // scalar
            permalinkValue = ret;
          }
        }
      }
    }

    if (permalinkValue !== undefined) {
      return this._getRawPermalinkInstance(permalinkValue);
    }

    // No `permalink` specified in data cascade, do the default
    let p = TemplatePermalink.generate(
      this.getTemplateSubfolder(),
      this.baseFile,
      this.extraOutputSubdirectory,
      this.htmlIOException ? this.config.htmlOutputSuffix : "",
      this.engine.defaultTemplateFileExtension
    );
    p.setUrlTransforms(this.config.urlTransforms);
    return p;
  }

  async usePermalinkRoot() {
    if (this._usePermalinkRoot === undefined) {
      // TODO this only works with immediate front matter and not data files
      this._usePermalinkRoot = (await this.getFrontMatterData())[this.config.keys.permalinkRoot];
    }

    return this._usePermalinkRoot;
  }

  // TODO instead of htmlIOException, do a global search to check if output path = input path and then add extra suffix
  async getOutputLocations(data) {
    this.bench.get("(count) getOutputLocations").incrementCount();
    let link = await this._getLink(data);

    let path;
    if (await this.usePermalinkRoot()) {
      path = link.toPathFromRoot();
    } else {
      path = link.toPath(this.outputDir);
    }

    return {
      linkInstance: link,
      rawPath: link.toOutputPath(),
      href: link.toHref(),
      path: path,
    };
  }

  // This is likely now a test-only method
  // Preferred to use the singular `getOutputLocations` above.
  async getRawOutputPath(data) {
    this.bench.get("(count) getRawOutputPath").incrementCount();
    let link = await this._getLink(data);
    return link.toOutputPath();
  }

  // Preferred to use the singular `getOutputLocations` above.
  async getOutputHref(data) {
    this.bench.get("(count) getOutputHref").incrementCount();
    let link = await this._getLink(data);
    return link.toHref();
  }

  // Preferred to use the singular `getOutputLocations` above.
  async getOutputPath(data) {
    this.bench.get("(count) getOutputPath").incrementCount();
    let link = await this._getLink(data);
    if (await this.usePermalinkRoot()) {
      return link.toPathFromRoot();
    }
    return link.toPath(this.outputDir);
  }

  async _testGetAllLayoutFrontMatterData() {
    let frontMatterData = await this.getFrontMatterData();
    if (frontMatterData[this.config.keys.layout]) {
      let layout = this.getLayout(frontMatterData[this.config.keys.layout]);
      return await layout.getData();
    }
    return {};
  }

  async getData() {
    if (this._dataCache) {
      return this._dataCache;
    }

    debugDev("%o getData", this.inputPath);
    let localData = {};
    let globalData = {};

    if (this.templateData) {
      localData = await this.templateData.getTemplateDirectoryData(this.inputPath);
      globalData = await this.templateData.getGlobalData(this.inputPath);
      debugDev("%o getData getTemplateDirectoryData and getGlobalData", this.inputPath);
    }

    let frontMatterData = await this.getFrontMatterData();
    let layoutKey =
      frontMatterData[this.config.keys.layout] ||
      localData[this.config.keys.layout] ||
      globalData[this.config.keys.layout];

    // Layout front matter data
    let mergedLayoutData = {};
    if (layoutKey) {
      let layout = this.getLayout(layoutKey);

      mergedLayoutData = await layout.getData();
      debugDev("%o getData merged layout chain front matter", this.inputPath);
    }

    let mergedData = TemplateData.mergeDeep(
      this.config,
      {},
      globalData,
      mergedLayoutData,
      localData,
      frontMatterData
    );
    mergedData = await this.addPageDate(mergedData);
    mergedData = this.addPageData(mergedData);
    debugDev("%o getData mergedData", this.inputPath);

    this._dataCache = mergedData;
    return mergedData;
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
    data.page.fileSlug = this.fileSlugStr;
    data.page.filePathStem = this.filePathStem;
    data.page.outputFileExtension = this.engine.defaultTemplateFileExtension;
    data.page.templateSyntax = this.templateRender.getEnginesList(
      data[this.config.keys.engineOverride]
    );

    return data;
  }

  // TODO This isn’t used any more, see `renderPageEntry`
  async renderLayout(tmpl, tmplData) {
    let layoutKey = tmplData[tmpl.config.keys.layout];
    let layout = this.getLayout(layoutKey);
    debug("%o is using layout %o", this.inputPath, layoutKey);

    let templateContent = await super.render(await this.getPreRender(), tmplData);

    return layout.render(tmplData, templateContent);
  }

  async renderDirect(str, data, bypassMarkdown) {
    return super.render(str, data, bypassMarkdown);
  }

  // This is the primary render mechanism, called via TemplateMap->populateContentDataInMap
  async renderWithoutLayout(data) {
    if (this._cacheRenderedContent) {
      return this._cacheRenderedContent;
    }

    let content = await this.getPreRender();
    let renderedContent = await this.renderDirect(content, data);
    this._cacheRenderedContent = renderedContent;
    return renderedContent;
  }

  // TODO This isn’t used any more, see `renderPageEntry`
  async render(data) {
    debugDev("%o render()", this.inputPath);
    if (!data) {
      throw new Error("`data` needs to be passed into render()");
    }

    if (data[this.config.keys.layout]) {
      return this.renderLayout(this, data);
    } else {
      debugDev("Template.render renderDirect for %o", this.inputPath);
      return this.renderWithoutLayout(data);
    }
  }

  addLinter(callback) {
    this.linters.push(callback);
  }

  async runLinters(str, page) {
    let { inputPath, outputPath, url } = page;
    let pageData = page.data.page;

    for (let linter of this.linters) {
      // these can be asynchronous but no guarantee of order when they run
      linter.call(
        {
          inputPath,
          outputPath,
          url,
          page: pageData,
        },
        str,
        inputPath,
        outputPath
      );
    }
  }

  addTransform(name, callback) {
    this.transforms.push({
      name,
      callback,
    });
  }

  async runTransforms(str, page) {
    let { inputPath, outputPath, url } = page;
    let pageData = page.data.page;

    for (let { callback, name } of this.transforms) {
      try {
        let hadStrBefore = !!str;
        str = await callback.call(
          {
            inputPath,
            outputPath,
            url,
            page: pageData,
          },
          str,
          outputPath
        );
        if (hadStrBefore && !str) {
          this.logger.warn(
            `Warning: Transform \`${name}\` returned empty when writing ${outputPath} from ${inputPath}.`
          );
        }
      } catch (e) {
        throw new EleventyTransformError(
          `Transform \`${name}\` encountered an error when transforming ${inputPath}.`,
          e
        );
      }
    }

    return str;
  }

  _addComputedEntry(computedData, obj, parentKey, declaredDependencies) {
    // this check must come before isPlainObject
    if (typeof obj === "function") {
      computedData.add(parentKey, obj, declaredDependencies);
    } else if (Array.isArray(obj) || isPlainObject(obj)) {
      for (let key in obj) {
        let keys = [];
        if (parentKey) {
          keys.push(parentKey);
        }
        keys.push(key);
        this._addComputedEntry(computedData, obj[key], keys.join("."), declaredDependencies);
      }
    } else if (typeof obj === "string") {
      computedData.addTemplateString(
        parentKey,
        async (innerData) => {
          return await this.renderComputedData(obj, innerData);
        },
        declaredDependencies,
        this.getParseForSymbolsFunction(obj)
      );
    } else {
      // Numbers, booleans, etc
      computedData.add(parentKey, obj, declaredDependencies);
    }
  }

  async addComputedData(data) {
    if (this.config.keys.computed in data) {
      this.computedData = new ComputedData(this.config);

      // Note that `permalink` is only a thing that gets consumed—it does not go directly into generated data
      // this allows computed entries to use page.url or page.outputPath and they’ll be resolved properly

      // TODO Room for optimization here—we don’t need to recalculate `getOutputHref` and `getOutputPath`
      // TODO Why are these using addTemplateString instead of add
      this.computedData.addTemplateString(
        "page.url",
        async (data) => await this.getOutputHref(data),
        data.permalink ? ["permalink"] : undefined,
        false // skip symbol resolution
      );

      this.computedData.addTemplateString(
        "page.outputPath",
        async (data) => await this.getOutputPath(data),
        data.permalink ? ["permalink"] : undefined,
        false // skip symbol resolution
      );

      // actually add the computed data
      this._addComputedEntry(this.computedData, data[this.config.keys.computed]);

      // limited run of computed data—save the stuff that relies on collections for later.
      debug("First round of computed data for %o", this.inputPath);
      await this.computedData.setupData(data, function (entry) {
        return !this.isUsesStartsWith(entry, "collections.");

        // TODO possible improvement here is to only process page.url, page.outputPath, permalink
        // instead of only punting on things that rely on collections.
        // let firstPhaseComputedData = ["page.url", "page.outputPath", ...this.getOrderFor("page.url"), ...this.getOrderFor("page.outputPath")];
        // return firstPhaseComputedData.indexOf(entry) > -1;
      });
    } else {
      if (!("page" in data)) {
        data.page = {};
      }

      // pagination will already have these set via Pagination->getPageTemplates
      if (data.page.url && data.page.outputPath) {
        return;
      }

      let { href, path } = await this.getOutputLocations(data);
      data.page.url = href;
      data.page.outputPath = path;
    }
  }

  // Computed data consuming collections!
  async resolveRemainingComputedData(data) {
    // If it doesn’t exist, computed data is not used for this template
    if (this.computedData) {
      debug("Second round of computed data for %o", this.inputPath);
      await this.computedData.processRemainingData(data);
    }
  }

  static augmentWithTemplateContentProperty(obj) {
    return Object.defineProperties(obj, {
      checkTemplateContent: {
        enumerable: false,
        writable: true,
        value: true,
      },
      _templateContent: {
        enumerable: false,
        writable: true,
        value: undefined,
      },
      templateContent: {
        enumerable: true,
        set(content) {
          if (content === undefined) {
            this.checkTemplateContent = false;
          }
          this._templateContent = content;
        },
        get() {
          if (this.checkTemplateContent && this._templateContent === undefined) {
            if (this.template.behavior.isRenderable()) {
              // should at least warn here
              throw new TemplateContentPrematureUseError(
                `Tried to use templateContent too early on ${this.inputPath}${
                  this.pageNumber ? ` (page ${this.pageNumber})` : ""
                }`
              );
            } else {
              throw new TemplateContentUnrenderedTemplateError(
                `Tried to use templateContent on unrendered template. You need a valid permalink (or permalink object) to use templateContent on ${
                  this.inputPath
                }${this.pageNumber ? ` (page ${this.pageNumber})` : ""}`
              );
            }
          }
          return this._templateContent;
        },
      },
      // Alias for templateContent for consistency
      content: {
        enumerable: true,
        get() {
          return this.templateContent;
        },
      },
    });
  }

  async getTemplates(data) {
    // no pagination with permalink.serverless
    if (!Pagination.hasPagination(data)) {
      await this.addComputedData(data);

      let obj = {
        template: this, // not on the docs but folks are relying on it
        data,

        page: data.page,
        inputPath: this.inputPath,
        fileSlug: this.fileSlugStr,
        filePathStem: this.filePathStem,
        date: data.page.date,
        outputPath: data.page.outputPath,
        url: data.page.url,
      };

      obj = Template.augmentWithTemplateContentProperty(obj);

      return [obj];
    } else {
      // needs collections for pagination items
      // but individual pagination entries won’t be part of a collection
      this.paging = new Pagination(this, data, this.config);

      let pageTemplates = await this.paging.getPageTemplates();
      return await Promise.all(
        pageTemplates.map(async (pageEntry, pageNumber) => {
          await pageEntry.template.addComputedData(pageEntry.data);

          let obj = {
            template: pageEntry.template, // not on the docs but folks are relying on it
            pageNumber: pageNumber,
            data: pageEntry.data,

            page: pageEntry.data.page,
            inputPath: this.inputPath,
            fileSlug: this.fileSlugStr,
            filePathStem: this.filePathStem,
            date: pageEntry.data.page.date,
            outputPath: pageEntry.data.page.outputPath,
            url: pageEntry.data.page.url,
          };

          obj = Template.augmentWithTemplateContentProperty(obj);

          return obj;
        })
      );
    }
  }

  async _write({ url, outputPath, data }, finalContent) {
    let lang = {
      start: "Writing",
      finished: "written.",
    };

    if (!this.isDryRun) {
      let engineList = this.templateRender.getReadableEnginesListDifferingFromFileExtension();
      this.logger.log(
        `${lang.start} ${outputPath} from ${this.inputPath}${engineList ? ` (${engineList})` : ""}`
      );
    } else if (this.isDryRun) {
      return;
    }

    let templateBenchmark = this.bench.get("Template Write");
    templateBenchmark.before();

    // TODO(@zachleat) add a cache to check if this was already created
    let templateOutputDir = path.parse(outputPath).dir;
    if (templateOutputDir) {
      await mkdir(templateOutputDir, { recursive: true });
    }

    if (!Buffer.isBuffer(finalContent) && typeof finalContent !== "string") {
      throw new Error(
        `The return value from the render function for the ${this.engine.name} template was not a String or Buffer. Received ${finalContent}`
      );
    }

    return writeFile(outputPath, finalContent).then(() => {
      templateBenchmark.after();
      this.writeCount++;
      debug(`${outputPath} ${lang.finished}.`);

      let ret = {
        inputPath: this.inputPath,
        outputPath: outputPath,
        url,
        content: finalContent,
      };

      if (data && this.config.dataFilterSelectors && this.config.dataFilterSelectors.size > 0) {
        ret.data = this.retrieveDataForJsonOutput(data, this.config.dataFilterSelectors);
      }

      return ret;
    });
  }

  async renderPageEntry(mapEntry, page) {
    // cache with transforms output
    if (this._cacheFinalContent) {
      return this._cacheFinalContent;
    }

    let content;
    let layoutKey = mapEntry.data[this.config.keys.layout];
    if (layoutKey) {
      let layout = this.getLayout(layoutKey);

      content = await layout.render(page.data, page.templateContent);
    } else {
      content = page.templateContent;
    }

    await this.runLinters(content, page);
    content = await this.runTransforms(content, page);

    this._cacheFinalContent = content;

    return content;
  }

  retrieveDataForJsonOutput(data, selectors) {
    let filtered = {};
    for (let selector of selectors) {
      let value = lodashGet(data, selector);
      lodashSet(filtered, selector, value);
    }
    return filtered;
  }

  async generateMapEntry(mapEntry, to) {
    return Promise.all(
      mapEntry._pages.map(async (page) => {
        let content;
        // Note that behavior.render is overridden when using json or ndjson output
        if (mapEntry.template.behavior.isRenderable()) {
          // this reuses page.templateContent, it doesn’t render it
          content = await this.renderPageEntry(mapEntry, page);
        }

        if (to === "json" || to === "ndjson") {
          let obj = {
            url: page.url,
            inputPath: page.inputPath,
            outputPath: page.outputPath,
            content: content,
          };

          if (this.config.dataFilterSelectors && this.config.dataFilterSelectors.size > 0) {
            obj.data = this.retrieveDataForJsonOutput(page.data, this.config.dataFilterSelectors);
          }

          if (to === "ndjson") {
            let jsonString = JSON.stringify(obj);
            this.logger.toStream(jsonString + os.EOL);
            return;
          }

          // json
          return obj;
        }

        if (!mapEntry.template.behavior.isRenderable()) {
          debug(
            "Template not written %o from %o (via serverless permalink).",
            page.outputPath,
            mapEntry.template.inputPath
          );
          return;
        }

        if (!mapEntry.template.behavior.isWriteable()) {
          debug(
            "Template not written %o from %o (via permalink: false, permalink.build: false, or a permalink object without a build property).",
            page.outputPath,
            mapEntry.template.inputPath
          );
          return;
        }

        // compile returned undefined
        if (content !== undefined) {
          return this._write(page, content);
        }
      })
    );
  }

  clone() {
    // TODO do we need to even run the constructor here or can we simplify it even more
    let tmpl = new Template(
      this.inputPath,
      this.inputDir,
      this.outputDir,
      this.templateData,
      this.extensionMap,
      this.eleventyConfig
    );

    // preserves caches too, e.g. _frontMatterDataCache
    for (let key in this) {
      tmpl[key] = this[key];
    }

    return tmpl;
  }

  getWriteCount() {
    return this.writeCount;
  }

  async getInputFileStat() {
    if (this._stats) {
      return this._stats;
    }

    this._stats = fs.promises.stat(this.inputPath);

    return this._stats;
  }

  async _getDateInstance(key = "birthtimeMs") {
    let stat = await this.getInputFileStat();

    // Issue 1823: https://github.com/11ty/eleventy/issues/1823
    // return current Date in a Lambda
    // otherwise ctime would be "1980-01-01T00:00:00.000Z"
    // otherwise birthtime would be "1970-01-01T00:00:00.000Z"
    if (stat.birthtimeMs === 0) {
      return new Date();
    }

    let newDate = new Date(stat[key]);

    debug(
      "Template date: using file’s %o for %o of %o (from %o)",
      key,
      this.inputPath,
      newDate,
      stat.birthtimeMs
    );

    return newDate;
  }

  async getMappedDate(data) {
    if ("date" in data && data.date) {
      debug("getMappedDate: using a date in the data for %o of %o", this.inputPath, data.date);
      if (data.date instanceof Date) {
        // YAML does its own date parsing
        debug("getMappedDate: YAML parsed it: %o", data.date);
        return data.date;
      }

      // special strings
      if (data.date.toLowerCase() === "git last modified") {
        let d = getDateFromGitLastUpdated(this.inputPath);
        if (d) {
          return d;
        }

        // return now if this file is not yet available in `git`
        return new Date();
      }
      if (data.date.toLowerCase() === "last modified") {
        return this._getDateInstance("ctimeMs");
      }
      if (data.date.toLowerCase() === "git created") {
        let d = getDateFromGitFirstAdded(this.inputPath);
        if (d) {
          return d;
        }

        // return now if this file is not yet available in `git`
        return new Date();
      }
      if (data.date.toLowerCase() === "created") {
        return this._getDateInstance("birthtimeMs");
      }

      // try to parse with Luxon
      let date = DateTime.fromISO(data.date, { zone: "utc" });
      if (!date.isValid) {
        throw new Error(`date front matter value (${data.date}) is invalid for ${this.inputPath}`);
      }
      debug("getMappedDate: Luxon parsed %o: %o and %o", data.date, date, date.toJSDate());

      return date.toJSDate();
    } else {
      let filepathRegex = this.inputPath.match(/(\d{4}-\d{2}-\d{2})/);
      if (filepathRegex !== null) {
        // if multiple are found in the path, use the first one for the date
        let dateObj = DateTime.fromISO(filepathRegex[1], {
          zone: "utc",
        }).toJSDate();
        debug(
          "getMappedDate: using filename regex time for %o of %o: %o",
          this.inputPath,
          filepathRegex[1],
          dateObj
        );
        return dateObj;
      }

      return this._getDateInstance("birthtimeMs");
    }
  }

  // Important reminder: Template data is first generated in TemplateMap
  async getTemplateMapEntries(data) {
    debugDev("%o getMapped()", this.inputPath);

    this.behavior.setRenderViaDataCascade(data);

    let entries = [];
    // does not return outputPath or url, we don’t want to render permalinks yet
    entries.push({
      template: this,
      inputPath: this.inputPath,
      data,
    });

    return entries;
  }
}

module.exports = Template;
