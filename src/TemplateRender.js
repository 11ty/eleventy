const TemplatePath = require("./TemplatePath");
const TemplateEngine = require("./Engines/TemplateEngine");
const EleventyBaseError = require("./EleventyBaseError");
const EleventyExtensionMap = require("./EleventyExtensionMap");
const config = require("./Config");
// const debug = require("debug")("Eleventy:TemplateRender");

class TemplateRenderUnknownEngineError extends EleventyBaseError {}

// works with full path names or short engine name
class TemplateRender {
  constructor(tmplPath, inputDir, extensionMap) {
    if (!tmplPath) {
      throw new Error(
        `TemplateRender requires a tmplPath argument, instead of ${tmplPath}`
      );
    }

    this.path = tmplPath;
    this.extensionMap = extensionMap;

    // optional
    this.includesDir = this._normalizeIncludesDir(inputDir);

    this.parseMarkdownWith = this.config.markdownTemplateEngine;
    this.parseHtmlWith = this.config.htmlTemplateEngine;

    this.init(tmplPath);

    this.useMarkdown = this.engineName === "md";
  }

  get config() {
    if (!this._config) {
      this._config = config.getConfig();
    }
    return this._config;
  }

  set config(config) {
    this._config = config;

    if (this.engine) {
      this.engine.config = config;
    }
  }

  init(engineNameOrPath) {
    this.engineName = this.cleanupEngineName(engineNameOrPath);
    if (!this.engineName) {
      throw new TemplateRenderUnknownEngineError(
        `Unknown engine for ${engineNameOrPath}`
      );
    }
    this.engine = TemplateEngine.getEngine(this.engineName, this.includesDir);
    this.engine.initRequireCache(this.path);
  }

  cleanupEngineName(tmplPath) {
    return TemplateRender._cleanupEngineName(
      tmplPath,
      this.extensionMap || EleventyExtensionMap
    );
  }
  static cleanupEngineName(tmplPath) {
    return TemplateRender._cleanupEngineName(tmplPath, EleventyExtensionMap);
  }
  static _cleanupEngineName(tmplPath, extensionMapRef) {
    return extensionMapRef.getKey(tmplPath);
  }

  static hasEngine(tmplPath) {
    let name = TemplateRender.cleanupEngineName(tmplPath);
    return TemplateEngine.hasEngine(name);
  }

  static parseEngineOverrides(engineName) {
    let overlappingEngineWarningCount = 0;
    let engines = [];
    let uniqueLookup = {};
    let usingMarkdown = false;
    (engineName || "")
      .split(",")
      .map(name => {
        return name.toLowerCase().trim();
      })
      .forEach(name => {
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
      // todo use unshift or something (no wifi here to look up docs :D)
      engines = ["md"].concat(engines);
    }

    return engines;
  }

  // used for error logging.
  getEnginesStr() {
    if (this.engineName === "md" && this.useMarkdown) {
      return this.parseMarkdownWith + " (and markdown)";
    }
    return this.engineName;
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

  setMarkdownEngine(markdownEngine) {
    this.parseMarkdownWith = markdownEngine;
  }

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
        this.path,
        this.parseMarkdownWith,
        !this.useMarkdown
      );
    } else if (this.engineName === "html") {
      return this.engine.compile(str, this.path, this.parseHtmlWith);
    } else {
      return this.engine.compile(str, this.path);
    }
  }
}

module.exports = TemplateRender;
