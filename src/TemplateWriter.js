const globby = require("globby");
const normalize = require("normalize-path");
const pretty = require("pretty");
const Template = require("./Template");
const TemplateRender = require("./TemplateRender");
const TemplateConfig = require("./TemplateConfig");

const pkg = require("../package.json");

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();


function TemplateWriter(baseDir, outputDir, extensions, templateData) {
	this.baseDir = baseDir;
	this.templateExtensions = extensions;
	this.outputDir = outputDir;
	this.templateData = templateData;

	this.rawFiles = this.templateExtensions.map(function(extension) {
		return normalize( this.baseDir + "/**/*." + extension );
	}.bind(this));

	this.files = this.addIgnores(baseDir, this.rawFiles);
}

TemplateWriter.prototype.getFiles = function() {
	return this.files;
};

TemplateWriter.prototype.addIgnores = function(baseDir, files) {
	return files.concat(
		"!" + normalize(baseDir + "/" + cfg.dir.output + "/*"),
		"!" + normalize(baseDir + "/" + cfg.dir.layouts + "/*")
	);
};

TemplateWriter.prototype._getTemplate = function(path) {
	let tmpl = new Template(path, this.baseDir, this.outputDir, this.templateData);
	tmpl.addPostProcessFilter(function(str) {
		return pretty(str, { ocd: true });
	});
	return tmpl;
};

TemplateWriter.prototype._writeTemplate = async function(path) {
	let tmpl = this._getTemplate( path );
	await tmpl.write();
	return tmpl;
};

TemplateWriter.prototype.write = async function() {
	var paths = globby.sync(this.files);
	for( var j = 0, k = paths.length; j < k; j++ ) {
		await this._writeTemplate( paths[j] );
	}
};

module.exports = TemplateWriter;
