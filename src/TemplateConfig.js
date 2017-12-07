const fs = require("fs-extra");
const TemplatePath = require("./TemplatePath");

function TemplateConfig(globalConfig, localConfigPath) {
	this.localConfigPath = localConfigPath || "elevenisland.config.js";
	this.config = this.mergeConfig(globalConfig);
}

TemplateConfig.prototype.getConfig = function() {
	return this.config;
};

TemplateConfig.prototype.mergeConfig = function( globalConfig ) {
	let localConfig;
	let path = TemplatePath.normalize( TemplatePath.getWorkingDir() + "/" + this.localConfigPath );
	try {
		localConfig = require( path );
	} catch(e) {
		// if file does not exist, return empty obj
		localConfig = {};
	}

	return Object.assign( {}, globalConfig, localConfig );
};

module.exports = TemplateConfig;
