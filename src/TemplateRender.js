const TemplatePath = require("./TemplatePath");
const TemplateConfig = require("./TemplateConfig");
const EleventyBaseError = require("./EleventyBaseError");
const EleventyExtensionMap = require("./EleventyExtensionMap");
// const debug = require("debug")("Eleventy:TemplateRender");

class TemplateRenderConfigError extends EleventyBaseError {}
class TemplateRenderUnknownEngineError extends EleventyBaseError {}

// works with full path names or short engine name
class TemplateRender {
  constructor(tmplPath, inputDir, config) {
    if (!tmplPath) {
      throw new Error(
        `TemplateRender requires a tmplPath argument, instead of ${tmplPath}`
      );
    }
    if (!config) {
      throw new TemplateRenderConfigError("Missing `config` argument.");
    }
    if (config instanceof TemplateConfig) {
      this.eleventyConfig = config;
    }
    this.config = config;

    this.engineNameOrPath = tmplPath;
    this.inputDir = inputDir;

    // optional
    this.includesDir = this._normalizeIncludesDir(inputDir);

    this.parseMarkdownWith = this.config.markdownTemplateEngine;
    this.parseHtmlWith = this.config.htmlTemplateEngine;
  }

  get config() {
    if (this._config instanceof TemplateConfig) {
      return this._config.getConfig();
    }
    return this._config;
  }

  set config(config) {
    this._config = config;
  }

  set extensionMap(extensionMap) {
    this._extensionMap = extensionMap;
  }

  get extensionMap() {
    if (!this._extensionMap) {
      this._extensionMap = new EleventyExtensionMap([], this.config);
    }
    return this._extensionMap;
  }

  // Runs once per template
  init(engineNameOrPath) {
    this.extensionMap.config = this.config;
    this._engineName = this.extensionMap.getKey(engineNameOrPath);
    if (!this._engineName) {
      throw new TemplateRenderUnknownEngineError(
        `Unknown engine for ${engineNameOrPath} (supported extensions: ${this.extensionMap.getReadableFileExtensions()})`
      );
    }

    this._engine = this.extensionMap.engineManager.getEngine(
      this._engineName,
      this.includesDir,
      this.extensionMap
    );
    this._engine.config = this.config;
    this._engine.initRequireCache(engineNameOrPath);

    if (this.useMarkdown === undefined) {
      this.setUseMarkdown(this._engineName === "md");
    }
  }

  get engineName() {
    if (!this._engineName) {
      this.init(this.engineNameOrPath);
    }
    return this._engineName;
  }

  get engine() {
    if (!this._engine) {
      this.init(this.engineNameOrPath);
    }
    return this._engine;
  }

  static parseEngineOverrides(engineName) {
    let overlappingEngineWarningCount = 0;
    let engines = [];
    let uniqueLookup = {};
    let usingMarkdown = false;
    (engineName || "")
      .split(",")
      .map((name) => {
        return name.toLowerCase().trim();
      })
      .forEach((name) => {
        // html is assumed (treated as plaintext by the system)
        if (!name || name === "html") {
          return;
        }

        if (name === "md") {
          usingMarkdown = true;
          return;
        }

        if (!uniqueLookup[name]) {
          engines.push(name);
          uniqueLookup[name] = true;

          // we already short circuit md and html types above
          overlappingEngineWarningCount++;
        }
      });

    if (overlappingEngineWarningCount > 1) {
      throw new Error(
        `Don’t mix multiple templating engines in your front matter overrides (exceptions for HTML and Markdown). You used: ${engineName}`
      );
    }

    // markdown should always be first
    if (usingMarkdown) {
      engines.unshift("md");
    }

    return engines;
  }

  // used for error logging and console output.
  getReadableEnginesList() {
    return (
      this.getReadableEnginesListDifferingFromFileExtension() || this.engineName
    );
  }

  getReadableEnginesListDifferingFromFileExtension() {
    if (
      this.engineName === "md" &&
      this.useMarkdown &&
      this.parseMarkdownWith
    ) {
      return this.parseMarkdownWith;
    }
    if (this.engineName === "html" && this.parseHtmlWith) {
      return this.parseHtmlWith;
    }

    // templateEngineOverride in play and template language differs from file extension
    let keyFromFilename = this.extensionMap.getKey(this.engineNameOrPath);
    if (keyFromFilename !== this.engineName) {
      return this.engineName;
    }
  }

  setEngineOverride(engineName, bypassMarkdown) {
    let engines = TemplateRender.parseEngineOverrides(engineName);

    // when overriding, Template Engines with HTML will instead use the Template Engine as primary and output HTML
    // So any HTML engine usage here will never use a preprocessor templating engine.
    this.setHtmlEngine(false);

    if (!engines.length) {
      this.init("html");
      return;
    }

    this.init(engines[0]);

    let usingMarkdown = engines[0] === "md" && !bypassMarkdown;

    this.setUseMarkdown(usingMarkdown);

    if (usingMarkdown) {
      // false means only parse markdown and not with a preprocessor template engine
      this.setMarkdownEngine(engines.length > 1 ? engines[1] : false);
    }
  }

  getEngineName() {
    return this.engineName;
  }

  getIncludesDir() {
    return this.includesDir;
  }

  _normalizeIncludesDir(dir) {
    return TemplatePath.join(
      dir ? dir : this.config.dir.input,
      this.config.dir.includes
    );
  }

  isEngine(engine) {
    return this.engineName === engine;
  }

  setUseMarkdown(useMarkdown) {
    this.useMarkdown = !!useMarkdown;
  }

  // this is only called for templateEngineOverride
  setMarkdownEngine(markdownEngine) {
    this.parseMarkdownWith = markdownEngine;
  }

  // this is only called for templateEngineOverride
  setHtmlEngine(htmlEngineName) {
    this.parseHtmlWith = htmlEngineName;
  }

  async _testRender(str, data) {
    return this.engine._testRender(str, data);
  }

  async getCompiledTemplate(str) {
    // TODO refactor better, move into TemplateEngine logic
    if (this.engineName === "md") {
      return this.engine.compile(
        str,
        this.engineNameOrPath,
        this.parseMarkdownWith,
        !this.useMarkdown
      );
    } else if (this.engineName === "html") {
      return this.engine.compile(
        str,
        this.engineNameOrPath,
        this.parseHtmlWith
      );
    } else {
      return this.engine.compile(str, this.engineNameOrPath);
    }
  }
}

module.exports = TemplateRender;
