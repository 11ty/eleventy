const fs = require("fs-extra");
const normalize = require("normalize-path");
const matter = require("gray-matter");

const TemplateRender = require("./TemplateRender");
const EleventyBaseError = require("./EleventyBaseError");
const config = require("./Config");
const debug = require("debug")("Eleventy:TemplateContent");
const debugDev = require("debug")("Dev:Eleventy:TemplateContent");

class TemplateContentCompileError extends EleventyBaseError {}
class TemplateContentRenderError extends EleventyBaseError {}

class TemplateContent {
  constructor(inputPath, inputDir) {
    this.config = config.getConfig();
    this.inputPath = inputPath;

    if (inputDir) {
      this.inputDir = normalize(inputDir);
    } else {
      this.inputDir = false;
    }

    this.templateRender = new TemplateRender(this.inputPath, this.inputDir);
  }

  getInputPath() {
    return this.inputPath;
  }

  getInputDir() {
    return this.inputDir;
  }

  async read() {
    this.inputContent = await this.getInputContent();
    this.frontMatter = matter(this.inputContent);
  }

  async getInputContent() {
    return fs.readFile(this.inputPath, "utf-8");
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

  cleanupFrontMatterData(data) {
    if ("tags" in data && typeof data.tags === "string") {
      data.tags = [data.tags];
    }
    return data;
  }

  async getFrontMatterData() {
    if (!this.frontMatter) {
      await this.read();
    }

    return this.cleanupFrontMatterData(this.frontMatter.data || {});
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
      throw new TemplateContentRenderError(
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
      debug(`Having trouble rendering template ${this.inputPath}: %O`, str);
      throw new TemplateContentRenderError(
        `Having trouble rendering template ${this.inputPath}`,
        e
      );
    }
  }
}

module.exports = TemplateContent;
