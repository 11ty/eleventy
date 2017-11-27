const fs = require("fs-extra");
const globby = require('globby');

const Template = require( "./Template" );
const TemplateRender = require( "./TemplateRender" );
const PKG = require("../package.json");

function TemplateWriter(files, globalDataPath) {
	this.files = files;
	this.globalRenderFunction = (new TemplateRender()).getRenderFunction();

	this.globalDataPath = globalDataPath;
	this.globalData = this.mergeDataImports(this.readJsonAsTemplate(globalDataPath));
}

TemplateWriter.prototype.mergeDataImports = function(data) {
	data._package = PKG;
	return data;
};

TemplateWriter.prototype.readJsonAsTemplate = function( path ) {
	return JSON.parse( this.globalRenderFunction( fs.readFileSync( path, "utf-8" ), this.mergeDataImports({})));
};

TemplateWriter.prototype.write = function() {
	let self = this;
	globby(this.files).then(function(templates) {
		templates.forEach(function(path) {
			console.log( "Reading", path );
			let tmpl = new Template( path, self.globalData );
			tmpl.write();
		});
	});
};

module.exports = TemplateWriter;