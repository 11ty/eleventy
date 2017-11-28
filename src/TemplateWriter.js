const fs = require("fs-extra");
const globby = require('globby');
const normalize = require('normalize-path');
const parsePath = require('parse-filepath');

const Template = require( "./Template" );
const TemplateRender = require( "./TemplateRender" );
const PKG = require("../package.json");

function TemplateWriter(baseDir, files, globalDataPath, outputDir) {
	this.baseDir = baseDir;
	this.files = this.addFiles(baseDir, files);
	this.globalRenderFunction = (new TemplateRender()).getRenderFunction();

	this.globalDataPath = globalDataPath;
	this.globalData = this.mergeDataImports(this.readJsonAsTemplate(globalDataPath));

	this.outputDir = outputDir;
}

TemplateWriter.prototype.addFiles = function(baseDir, files) {
	return files.concat( "!" + normalize( baseDir + "/_layouts/*" ), "!" + normalize( baseDir + "/_components/*" ) );
};

TemplateWriter.prototype.mergeDataImports = function(data) {
	data._package = PKG;
	data._components = {};

	let self = this;
	globby.sync(this.baseDir + "/_components/*" ).forEach(function(component) {
		let parsed = parsePath( component );
		data._components[ parsed.name ] = function(data) {
			let tmpl = new Template( component, self.globalData, false );
			let merged = tmpl.mergeData(self.globalData, tmpl.getMatter().data, data);
			return tmpl.getCompiledTemplate()(merged);
		};
	});

	return data;
};

TemplateWriter.prototype.readJsonAsTemplate = function( path ) {
	return JSON.parse( this.globalRenderFunction( fs.readFileSync( path, "utf-8" ), this.mergeDataImports({})));
};

TemplateWriter.prototype.write = function() {
	let self = this;
	globby.sync(this.files).forEach(function(path) {
		let tmpl = new Template( path, self.globalData, self.outputDir );
		tmpl.write();
	});
};

module.exports = TemplateWriter;