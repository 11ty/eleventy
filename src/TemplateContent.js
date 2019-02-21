const fs = require("fs-extra");
const normalize = require("normalize-path");
const matter = require("gray-matter");

const TemplateData = require("./TemplateData");
const TemplateRender = require("./TemplateRender");
const EleventyBaseError = require("./EleventyBaseError");
const EleventyErrorUtil = require("./EleventyErrorUtil");
const config = require("./Config");
const debug = require("debug")("Eleventy:TemplateContent");
const debugDev = require("debug")("Dev:Eleventy:TemplateContent");

class TemplateContentCompileError extends EleventyBaseError {}
class TemplateContentRenderError extends EleventyBaseError {}

class TemplateContent {
  constructor(inputPath, inputDir) {
    this.inputPath = inputPath;

    if (inputDir) {
      this.inputDir = normalize(inputDir);
    } else {
      this.inputDir = false;
    }
  }

  /* Used by tests */
  _setExtensionMap(map) {
    this._extensionMap = map;
  }

  set config(config) {
    this._config = config;
  }

  get config() {
    if (!this._config) {
      this._config = config.getConfig();
    }

    return this._config;
  }

  get engine() {
    return this.templateRender.engine;
  }

  get templateRender() {
    if (!this._templateRender) {
      this._templateRender = new TemplateRender(
        this.inputPath,
        this.inputDir,
        this._extensionMap
      );
    }

    return this._templateRender;
  }

  getInputPath() {
    return this.inputPath;
  }

  getInputDir() {
    return this.inputDir;
  }

  async read() {
    this.inputContent = await this.getInputContent();

    if (this.inputContent) {
      this.frontMatter = matter(this.inputContent);
    } else {
      this.frontMatter = {
        data: {},
        content: ""
      };
    }
  }

  async getInputContent() {
    if (this.engine.needsToReadFileContents()) {
      return fs.readFile(this.inputPath, "utf-8");
    }

    return "";
  }

  async getFrontMatter() {
    if (!this.frontMatter) {
      await this.read();
    }

    return this.frontMatter;
  }

  async getPreRender() {
    if (!this.frontMatter) {
      await this.read();
    }

    return this.frontMatter.content;
  }

  async getFrontMatterData() {
    if (!this.frontMatter) {
      await this.read();
    }

    let extraData = await this.engine.getExtraDataFromFile(this.inputPath);
    let data = TemplateData.mergeDeep({}, this.frontMatter.data, extraData);
    return TemplateData.cleanupData(data);
  }

  async getEngineOverride() {
    let frontMatterData = await this.getFrontMatterData();
    return frontMatterData[this.config.keys.engineOverride];
  }

  async setupTemplateRender(bypassMarkdown) {
    let engineOverride = await this.getEngineOverride();
    if (engineOverride !== undefined) {
      debugDev(
        "%o overriding template engine to use %o",
        this.inputPath,
        engineOverride
      );

      this.templateRender.setEngineOverride(engineOverride, bypassMarkdown);
    } else {
      this.templateRender.setUseMarkdown(!bypassMarkdown);
    }
  }

  async compile(str, bypassMarkdown) {
    await this.setupTemplateRender(bypassMarkdown);

    debugDev(
      "%o compile() using engine: %o",
      this.inputPath,
      this.templateRender.engineName
    );

    try {
      let fn = await this.templateRender.getCompiledTemplate(str);
      debugDev("%o getCompiledTemplate function created", this.inputPath);
      return fn;
    } catch (e) {
      debug(`Having trouble compiling template ${this.inputPath}: %O`, str);
      throw new TemplateContentCompileError(
        `Having trouble compiling template ${this.inputPath}`,
        e
      );
    }
  }

  async render(str, data, bypassMarkdown) {
    try {
      let fn = await this.compile(str, bypassMarkdown);
      let rendered = await fn(data);
      debugDev(
        "%o getCompiledTemplate called, rendered content created",
        this.inputPath
      );
      return rendered;
    } catch (e) {
      if (EleventyErrorUtil.isPrematureTemplateContentError(e)) {
        throw e;
      } else {
        let engine = this.templateRender.getEnginesStr();
        debug(
          `Having trouble rendering ${engine} template ${this.inputPath}: %O`,
          str
        );
        throw new TemplateContentRenderError(
          `Having trouble rendering ${engine} template ${this.inputPath}`,
          e
        );
      }
    }
  }
}

module.exports = TemplateContent;
