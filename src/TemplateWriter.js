const globby = require("globby");
const normalize = require("normalize-path");
const pretty = require("pretty");

const Template = require("./Template");
const TemplateRender = require("./TemplateRender");
const pkg = require("../package.json");
const cfg = require("../config.json");

function TemplateWriter(baseDir, files, outputDir, templateData) {
	this.baseDir = baseDir;
	this.files = this.addFiles(baseDir, files);
	this.outputDir = outputDir;
	this.templateData = templateData;
}

TemplateWriter.prototype.addFiles = function(baseDir, files) {
	return files.concat(
		"!" + normalize(baseDir + "/" + cfg.dir.layouts + "/*"),
		"!" + normalize(baseDir + "/" + cfg.dir.components + "/*")
	);
};

TemplateWriter.prototype.write = function() {
	let self = this;
	globby.sync(this.files).forEach(function(path) {
		let tmpl = new Template(path, self.outputDir, self.templateData);
		tmpl.addPostProcessFilter(function(str) {
			return pretty(str, { ocd: true });
		});
		tmpl.write();
	});
};

module.exports = TemplateWriter;
