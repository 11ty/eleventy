const parsePath = require('parse-filepath');
const path = require("path");
const ejs = require( "ejs" );
const md = require('markdown-it')();
const Handlebars = require('handlebars');
const Mustache = require('mustache');
const haml = require('hamljs');
const pug = require('pug');
const nunjucks = require('nunjucks');
const Liquid = require('liquidjs');
const fs = require("fs-extra");
const globby = require("globby");

const cfg = require("../config.json");
const TemplatePath = require("./TemplatePath");

// works with full path names or short engine name
function TemplateRender( tmplPath, inputDir ) {
	this.path = tmplPath;
	this.parsed = tmplPath ? parsePath( tmplPath ) : undefined;
	this.engineName = this.parsed && this.parsed.ext ? this.parsed.ext.substr(1) : tmplPath;
	this.defaultMarkdownEngine = cfg.markdownTemplateEngine || "liquid";
	this.defaultHtmlEngine = cfg.htmlTemplateEngine || "liquid";
	this.inputDir = inputDir;
	this.partials = this.cachePartialFiles( this.engineName );

	if( this.engineName === "hbs" ) {
		this.registerHandlebarsPartials();
	}
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

TemplateRender.prototype.getInputDir = function() {
	return this.inputDir ?
		TemplatePath.normalize( this.inputDir, cfg.dir.includes ) :
		TemplatePath.normalize( cfg.dir.templates, cfg.dir.includes );
};

TemplateRender.prototype.isEngine = function(engine) {
	return this.engineName === engine;
};

TemplateRender.prototype.cachePartialFiles = function(engineName) {
	let partials = {};
	// TODO: reuse mustache partials in handlebars?
	let partialFiles = globby.sync( this.getInputDir() + "/*." + engineName );
	for( var j = 0, k = partialFiles.length; j < k; j++ ) {
		let key = parsePath( partialFiles[ j ] ).name;
		partials[ key ] = fs.readFileSync(partialFiles[ j ], "utf-8");
	}
	return partials;
};

TemplateRender.prototype.registerHandlebarsPartials = function() {
	for( var name in this.partials ) {
		Handlebars.registerPartial( name, this.partials[ name ] );
	}
};

TemplateRender.prototype.render = async function(str, data) {
	let fn = await this.getCompiledTemplatePromise(str);
	return fn(data);
};

TemplateRender.prototype.getCompiledTemplatePromise = async function(str, options) {
	options = Object.assign({
		parseMarkdownWith: this.defaultMarkdownEngine,
		parseHtmlWith: this.defaultHtmlEngine
	}, options);

	if( this.engineName === "ejs" ) {
		let fn = ejs.compile(str, {
			root: "./" + this.getInputDir(),
			compileDebug: true
		});

		return function(data) {
			return fn(data);
		};
	} else if( this.engineName === "md" ) {
		if( options.parseMarkdownWith ) {
			let fn = await ((new TemplateRender(options.parseMarkdownWith, this.inputDir)).getCompiledTemplatePromise(str));

			return async function(data) {
				return md.render(await fn(data));
			};
		} else {
			return function(data) {
				// do nothing with data if parseMarkdownWith is falsy
				return md.render(str);
			};
		}
	} else if( this.engineName === "html" ) {
		if( options.parseHtmlWith ) {
			let fn = await ((new TemplateRender(options.parseHtmlWith, this.inputDir)).getCompiledTemplatePromise(str));

			return async function(data) {
				return await fn(data);
			};
		} else {
			return function(data) {
				// do nothing with data if parseHtmlWith is falsy
				return str;
			};
		}
	} else if( this.engineName === "hbs" ) {
		let fn = Handlebars.compile(str);
		return function(data) {
			return fn(data);
		};
	} else if( this.engineName === "mustache" ) {
		return function(data) {
			return Mustache.render(str, data, this.partials).trim();
		}.bind( this );
	} else if( this.engineName === "haml" ) {
		return haml.compile(str);
	} else if( this.engineName === "pug" ) {
		return pug.compile(str, {
			basedir: this.getInputDir()
		});
	} else if( this.engineName === "njk" ) {
		let tmpl = new nunjucks.Template(str);
		return function(data) {
			return tmpl.render(data);
		};
	} else if( this.engineName === "liquid" ) {
		// warning, the include syntax supported here does not match what jekyll uses.
		let engine = Liquid({
			root: [this.getInputDir()],
			extname: '.liquid'
		});
		let tmpl = await engine.parse(str);
		return async function(data) {
			return await engine.render(tmpl, data);
		};
	} else {
		throw new Error(engine + " is not a supported template engine.");
	}
};

module.exports = TemplateRender;