const parsePath = require('parse-filepath');
const TemplatePath = require("./TemplatePath");
const TemplateEngine = require("./Engines/TemplateEngine");
const TemplateConfig = require("./TemplateConfig");

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();

// works with full path names or short engine name
function TemplateRender( tmplPath, inputDir ) {
	this.path = tmplPath;
	this.parsed = tmplPath ? parsePath( tmplPath ) : undefined;
	this.engineName = this.parsed && this.parsed.ext ? this.parsed.ext.substr(1) : tmplPath;
	this.inputDir = this._normalizeInputDir( inputDir );
	this.engine = TemplateEngine.getEngine( this.engineName, this.inputDir );

	this.defaultMarkdownEngine = cfg.markdownTemplateEngine || "liquid";
	this.defaultHtmlEngine = cfg.htmlTemplateEngine || "liquid";
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
	return dir ?
		TemplatePath.normalize( dir, cfg.dir.includes ) :
		TemplatePath.normalize( cfg.dir.input, cfg.dir.includes );
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

TemplateRender.prototype.getCompiledTemplatePromise = async function(str, options) {
	options = Object.assign({
		parseMarkdownWith: this.defaultMarkdownEngine,
		parseHtmlWith: this.defaultHtmlEngine
	}, options);

	// TODO refactor better
	if( this.engineName === "md" ) {
		return await this.engine.compile(str, options.parseMarkdownWith);
	} else if( this.engineName === "html" ) {
		return await this.engine.compile(str, options.parseHtmlWith);
	} else {
		return await this.engine.compile(str);
	}
};

module.exports = TemplateRender;