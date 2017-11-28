const ejs = require("ejs");
const fs = require("fs-extra");
const parsePath = require('parse-filepath');
const matter = require('gray-matter');
const normalize = require('normalize-path');
const TemplateRender = require( "./TemplateRender" );
const Layout = require( "./Layout" );

const cfg = require("../config.json");

function Template( path, globalData, outputDir ) {
	this.path = path;
	this.inputContent = this.getInput();
	this.parsed = parsePath( path );
	this.dir = this.cleanDir();
	this.frontMatter = this.getMatter();
	this.data = this.mergeData( globalData, this.frontMatter.data );
	this.outputDir = outputDir;
	this.outputPath = this.getOutputPath();
}
Template.prototype.cleanDir = function() {
	return normalize( this.parsed.dir.replace( /^\.\//, "" ).replace( new RegExp( "^" + cfg.dir.templates ), "" ) );
};
Template.prototype.getOutputPath = function() {
	return normalize( this.outputDir + "/" + ( this.dir ? this.dir + "/" : "" ) + this.parsed.name + ".html" );
};
Template.prototype.getInput = function() {
	return fs.readFileSync(this.path, "utf-8");
};
Template.prototype.getMatter = function() {
	return matter( this.inputContent );
};
Template.prototype.isIgnored = function() {
	return this.parsed.name.match(/^\_/) !== null;
};

Template.prototype.mergeData = function( globalData, pageData ) {
	let data = {};
	for( let j in globalData ) {
		data[ j ] = globalData[ j ];
	}
	for( let j in pageData ) {
		data[ j ] = pageData[ j ];
	}
	return data;
};
Template.prototype.getPreRender = function() {
	return this.frontMatter.content;
};
Template.prototype.renderLayout = function(tmpl, data) {
	let layoutPath = (new Layout( tmpl.data.layout, cfg.dir.templates + "/_layouts" )).getFullPath();

	console.log( "Reading layout " + tmpl.data.layout + ":", layoutPath );
	let layout = new Template( layoutPath, {}, this.outputDir );
	let layoutData = this.mergeData( layout.data, data );
	layoutData._layoutContent = this.renderContent( tmpl.getPreRender(), data );
	let rendered = layout.renderContent( layout.getPreRender(), layoutData );
	if( layout.data.layout ) {
		return this.renderLayout( layout, layoutData );
	}

	return rendered;
};
Template.prototype.renderContent = function( str, data ) {
	return ( new TemplateRender( this.path )).getRenderFunction()( str, data );
};
Template.prototype.render = function() {
	if( this.data.layout ) {
		return this.renderLayout(this, this.data);
	} else {
		return this.renderContent(this.getPreRender(), this.data);
	}
};
Template.prototype.write = function() {
	if( this.isIgnored() ) {
		console.log( "Ignoring", this.outputPath );
	} else {
		let err = fs.outputFileSync(this.outputPath, this.render());
		if(err) {
			throw err;
		}
		console.log( "Writing", this.outputPath );
	}
};

module.exports = Template;