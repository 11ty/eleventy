const ejs = require("ejs");
const fs = require("fs-extra");
const parsePath = require("parse-filepath");
const matter = require("gray-matter");
const normalize = require("normalize-path");
const TemplateRender = require("./TemplateRender");
const Layout = require("./Layout");
const TemplateConfig = require("./TemplateConfig");

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();

function Template(path, inputDir, outputDir, templateData) {
	this.inputPath = path;
	this.inputContent = fs.readFileSync(path, "utf-8");
	this.parsed = parsePath(path);

	if( inputDir ) {
		this.inputDir = normalize( inputDir );
		this.layoutsDir = this.inputDir + "/" + cfg.dir.layouts;
	} else {
		this.inputDir = false;
	}
	if( outputDir ) {
		this.outputDir = normalize( outputDir );
	} else {
		this.outputDir = false;
	}

	this.frontMatter = this.getMatter();

	this.postProcessFilters = [];
	this.templateData = templateData;

	this.templateRender = new TemplateRender(this.inputPath, this.inputDir);

	// HTML output can’t overwrite the HTML input file.
	this.isHtmlIOException = this.inputDir === this.outputDir && this.templateRender.isEngine("html");

	if( outputDir ) {
		this.outputPath = this.getOutputPath();
	}
}

Template.prototype.stripLeadingDotSlash = function(dir) {
	return dir.replace(/^\.\//, "");
};

Template.prototype.getTemplateSubfolder = function() {
	var pathDir = this.parsed.dir;
	var index = pathDir.indexOf( this.inputDir );

	return this.stripLeadingDotSlash( index > -1 ? pathDir.substr( this.inputDir.length + 1 ) : this.inputDir );
};

Template.prototype.getOutputPath = function() {
	let dir = this.getTemplateSubfolder();
// console.log( this.inputPath,"|", this.inputDir, "|", dir );
	return normalize(this.outputDir + "/" + (dir ? dir + "/" : "") + this.parsed.name + (this.isHtmlIOException ? "-output" : "") + ".html");
};

Template.prototype.isIgnored = function() {
	return this.parsed.name.match(/^\_/) !== null || this.outputDir === false;
};

Template.prototype.getMatter = function() {
	return matter(this.inputContent);
};

Template.prototype.getPreRender = function() {
	return this.frontMatter.content;
};

Template.prototype.getLayoutTemplate = function(name) {
	let path = new Layout(name, this.layoutsDir).getFullPath();
	return new Template(path, this.inputDir, this.outputDir);
};

Template.prototype.getFrontMatterData = function() {
	return this.frontMatter.data || {};
};

Template.prototype.getAllLayoutFrontMatterData = function(tmpl, data, merged) {
	if (!merged) {
		merged = data;
	}

	if (data.layout) {
		let layout = tmpl.getLayoutTemplate(data.layout);
		let layoutData = layout.getFrontMatterData();

		return this.getAllLayoutFrontMatterData(
			tmpl,
			layoutData,
			Object.assign({}, layoutData, merged)
		);
	}

	return merged;
};

Template.prototype.getData = async function(localData) {
	let data = {};

	if (this.templateData) {
		data = await this.templateData.getData();
	}

	let mergedLayoutData = this.getAllLayoutFrontMatterData(this, this.getFrontMatterData());
	return Object.assign({}, data, mergedLayoutData, localData);
};

Template.prototype.renderLayout = async function(tmpl, tmplData) {
	let layoutName = tmplData.layout;
	// TODO make layout key to be available to templates (without it causing issues with merge below)
	delete tmplData.layout;

	let layout = this.getLayoutTemplate(layoutName);
	let layoutData = await layout.getData(tmplData);

	// console.log( "LAYOUT CONTENT", tmpl.outputPath );
	// console.log( await this.renderContent( tmpl.getPreRender(), tmplData ) );
	layoutData._layoutContent = await this.renderContent(tmpl.getPreRender(), tmplData);

	if (layoutData.layout) {
		return await this.renderLayout(layout, layoutData);
	}

	return await layout.renderContent(layout.getPreRender(), layoutData);
};

Template.prototype.getCompiledPromise = async function() {
	return await this.templateRender.getCompiledTemplatePromise(this.getPreRender());
};

Template.prototype.renderContent = async function(str, data) {
	return await this.templateRender.render(str, data);
};

Template.prototype.render = async function() {
	let data = await this.getData();
	if (data.layout) {
		return await this.renderLayout(this, data);
	} else {
		return await this.renderContent(this.getPreRender(), data);
	}
};

Template.prototype.addPostProcessFilter = function(callback) {
	this.postProcessFilters.push(callback);
};

Template.prototype.runFilters = function(str) {
	this.postProcessFilters.forEach(function(filter) {
		str = filter(str);
	});
	return str;
};

Template.prototype.write = async function() {
	if (this.isIgnored()) {
		console.log("Ignoring", this.outputPath);
	} else {
		let str = await this.render();
		let filtered = this.runFilters(str);
		let err = fs.outputFileSync(this.outputPath, filtered);
		if (err) {
			throw err;
		}
		console.log("Writing", this.outputPath, "from", this.inputPath);
	}
};

module.exports = Template;
