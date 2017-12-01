const parsePath = require('parse-filepath');

const ejs = require( "ejs" );
const md = require('markdown-it')();
const Handlebars = require('handlebars');
const Mustache = require('mustache');
const haml = require('hamljs');
const pug = require('pug');
const nunjucks = require('nunjucks');
const liquidEngine = require('liquidjs')();

function TemplateRender( path ) {
	this.parsed = path ? parsePath( path ) : undefined;
}

TemplateRender.prototype.render = async function(str, data) {
	let fn = await this.getCompiledTemplatePromise(str);
	return fn(data);
};

TemplateRender.prototype.getCompiledTemplatePromise = function(str) {
	return new Promise(function (resolve, reject) {
		if( !this.parsed || this.parsed.ext === ".ejs" ) {
			resolve( ejs.compile(str) );
		} else if( this.parsed.ext === ".md" ) {
			(new TemplateRender()).getCompiledTemplatePromise(str).then(function(fn) {
				resolve(function(data) {
					return md.render(fn(data));
				});
			});
		} else if( this.parsed.ext === ".hbs" ) {
			resolve(Handlebars.compile(str));
		} else if( this.parsed.ext === ".mustache" ) {
			resolve(function(data) {
				return Mustache.render(str, data).trim();
			});
		} else if( this.parsed.ext === ".haml" ) {
			resolve(haml.compile(str));
		} else if( this.parsed.ext === ".pug" ) {
			resolve(pug.compile(str));
		} else if( this.parsed.ext === ".njk" ) {
			let tmpl = new nunjucks.Template(str);
			resolve(function(data) {
				return tmpl.render(data);
			});
		} else if( this.parsed.ext === ".liquid" ) {
			let tmpl = liquidEngine.parse(str);
			resolve(function(data) {
				return liquidEngine.render(tmpl, data); // is a promise too fuuuuck
			});
		}
	}.bind(this));
};

module.exports = TemplateRender;