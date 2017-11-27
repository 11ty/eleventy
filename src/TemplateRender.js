const parsePath = require('parse-filepath');
const ejs = require( "ejs" );
const md = require('markdown-it')();
const Handlebars = require('handlebars');
const Mustache = require('mustache');
const haml = require('hamljs');
const pug = require('pug');
const nunjucks = require('nunjucks');

function TemplateRender( path ) {
	this.parsed = path ? parsePath( path ) : undefined;
}

TemplateRender.prototype.getRenderFunction = function() {
	if( !this.parsed || this.parsed.ext === ".ejs" ) {
		return ejs.render;
	} else if( this.parsed.ext === ".md" ) {
		return function(str, data) {
			var render = (new TemplateRender()).getRenderFunction();
			return md.render(render(str, data)).trim();
		};
	} else if( this.parsed.ext === ".hbs" ) {
		return function(str, data) {
			return Handlebars.compile(str)(data).trim();
		}
	} else if( this.parsed.ext === ".mustache" ) {
		return function(str, data) {
			return Mustache.render(str, data).trim();
		}
	} else if( this.parsed.ext === ".haml" ) {
		return function(str, data) {
			return haml.compile(str)(data).trim();
		};
	} else if( this.parsed.ext === ".pug" ) {
		return function(str, data) {
			return pug.compile(str)(data).trim();
		};
	} else if( this.parsed.ext === ".njk" ) {
		return function(str, data) {
			nunjucks.configure({ autoescape: false });
			return nunjucks.renderString(str, data);
		};
	}
};

module.exports = TemplateRender;