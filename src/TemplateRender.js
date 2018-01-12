const parsePath = require("parse-filepath");
const TemplatePath = require("./TemplatePath");
const TemplateEngine = require("./Engines/TemplateEngine");
const config = require("./Config");

// works with full path names or short engine name
function TemplateRender(tmplPath, inputDir) {
  if (!tmplPath) {
    throw new Error(
      `TemplateRender requires a tmplPath argument, instead of ${tmplPath}`
    );
  }

  this.config = config.getConfig();
  this.path = tmplPath;

  this.parsed = tmplPath ? parsePath(tmplPath) : undefined;
  this.engineName =
    this.parsed && this.parsed.ext ? this.parsed.ext.substr(1) : tmplPath;
  this.inputDir = this._normalizeInputDir(inputDir);

  this.engine = TemplateEngine.getEngine(this.engineName, this.inputDir);
  this.defaultMarkdownEngine = this.config.markdownTemplateEngine;
  this.defaultHtmlEngine = this.config.htmlTemplateEngine;
}

TemplateRender.prototype.setDefaultMarkdownEngine = function(markdownEngine) {
  this.defaultMarkdownEngine = markdownEngine;
};

TemplateRender.prototype.setDefaultHtmlEngine = function(htmlEngine) {
  this.defaultHtmlEngine = htmlEngine;
};

TemplateRender.prototype.getEngineName = function() {
  return this.engineName;
};

TemplateRender.prototype._normalizeInputDir = function(dir) {
  return dir
    ? TemplatePath.normalize(dir, this.config.dir.includes)
    : TemplatePath.normalize(this.config.dir.input, this.config.dir.includes);
};

TemplateRender.prototype.getInputDir = function() {
  return this.inputDir;
};

TemplateRender.prototype.isEngine = function(engine) {
  return this.engineName === engine;
};

TemplateRender.prototype.render = async function(str, data) {
  return this.engine.render(str, data);
};

TemplateRender.prototype.getCompiledTemplate = async function(str, options) {
  options = Object.assign(
    {
      parseMarkdownWith: this.defaultMarkdownEngine,
      parseHtmlWith: this.defaultHtmlEngine,
      bypassMarkdown: false
    },
    options
  );

  // TODO refactor better
  if (this.engineName === "md") {
    return this.engine.compile(
      str,
      options.parseMarkdownWith,
      options.bypassMarkdown
    );
  } else if (this.engineName === "html") {
    return this.engine.compile(str, options.parseHtmlWith);
  } else {
    return this.engine.compile(str);
  }
};

module.exports = TemplateRender;
