const Template = require( "./Template" );
const globby = require('globby');
const parsePath = require('parse-filepath');
const cfg = require('../config.json');

function TemplateComponents(inputDir) {
	this.inputDir = inputDir;
	this.componentsPath = inputDir + "/" + cfg.dir.components;
}

TemplateComponents.prototype.getComponents = async function(templateData) {
	let components = {};

	const componentFiles = await globby(this.componentsPath + "/*");
	for( var j = 0, k = componentFiles.length; j < k; j++ ) {
		let name = parsePath( componentFiles[j] ).name;
		components[name] = await this.getComponentFn(componentFiles[j], templateData);
	}

	return components;
};

TemplateComponents.prototype.getComponentFn = async function(componentFile, templateData) {
	let tmpl = new Template( componentFile, this.inputDir, false, templateData );
	let templateFunction = await tmpl.getCompiledPromise();

	return function(data) {
		let mergedData = Object.assign({}, templateData.globalData, tmpl.getMatter().data, data);
		return templateFunction(mergedData);
	};
};

module.exports = TemplateComponents;