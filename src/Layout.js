const CFG = require( "../config.json" );
const fs = require("fs-extra");

function Layout( name, dir ) {
	this.dir = dir;
	this.name = name;
	this.filename = this.findFileName();
	this.fullPath = this.dir + "/" + this.filename;
}

Layout.prototype.getFullPath = function() {
	return this.fullPath;
};

Layout.prototype.findFileName = function() {
	let file;
	if( !fs.existsSync(this.dir) ) {
		throw Error( "Layout directory does not exist: " + this.dir );
	}
	CFG.templateFormats.forEach(function( extension ) {
		let filename = this.name + "." + extension;
		if(!file && fs.existsSync( this.dir + "/" + filename)) {
			file = filename;
		}
	}.bind(this));

	return file;
};

module.exports = Layout;