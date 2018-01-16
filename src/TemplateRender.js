const parsePath = require("parse-filepath");
const TemplatePath = require("./TemplatePath");
const TemplateEngine = require("./Engines/TemplateEngine");
const config = require("./Config");
const debug = require("debug")("TemplateRender");

// works with full path names or short engine name
function TemplateRender(tmplPath, inputDir) {
  if (!tmplPath) {
    throw new Error(
      `TemplateRender requires a tmplPath argument, instead of ${tmplPath}`
    );
  }

  this.config = config.getConfig();
  this.path = tmplPath;

  // if( inputDir ) {
  //   debug("New TemplateRender, tmplPath: %o, inputDir: %o", tmplPath, inputDir);
  // }

  this.engineName = TemplateRender.cleanupEngineName(tmplPath);
  this.inputDir = this._normalizeInputDir(inputDir);

  this.engine = TemplateEngine.getEngine(this.engineName, this.inputDir);
}

TemplateRender.cleanupEngineName = function(tmplPath) {
  tmplPath = tmplPath.toLowerCase();

  let parsed = tmplPath ? parsePath(tmplPath) : undefined;
  return parsed && parsed.ext ? parsed.ext.substr(1) : tmplPath;
};

TemplateRender.hasEngine = function(tmplPath) {
  let name = TemplateRender.cleanupEngineName(tmplPath);
  return name in TemplateEngine.engineMap;
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
      parseMarkdownWith: this.config.markdownTemplateEngine,
      parseHtmlWith: this.config.htmlTemplateEngine,
      bypassMarkdown: false
    },
    options
  );

  // TODO refactor better, move into TemplateEngine logic
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
