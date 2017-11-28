const fs = require("fs-extra");
const globby = require('globby');
const normalize = require('normalize-path');

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
	return files.concat( "!" + normalize( baseDir + "/_layouts/*" ) );
};

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
			let tmpl = new Template( path, self.globalData, self.outputDir );
			tmpl.write();
		});

		console.log( "Finished", (new Date()).toLocaleTimeString() );
	});
};

module.exports = TemplateWriter;