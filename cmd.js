#!/usr/bin/env node
const watch = require("glob-watcher");
const chalk = require("chalk");
const argv = require( "minimist" )( process.argv.slice(2) );
const normalize = require('normalize-path');
const TemplateWriter = require("./src/TemplateWriter");

const pkg = require("./package.json");
const cfg = require("./config.json");
// argv._ ? argv._ : 
const dir = argv.input ? argv.input : cfg.dir.templates;

let start = new Date();
let files = cfg.templateFormats.map(function(extension) {
	return normalize( dir + "/**/*." + extension );
});

let writer = new TemplateWriter(
	dir,
	files,
	cfg.dataFileName,
	argv.output || cfg.dir.output
);

if( argv.version ) {
	console.log( pkg.version );
} else if( argv.help ) {
	let out = [];
	out.push( "usage: elevenisland" );
	out.push( "       elevenisland --watch" );
	out.push( "       elevenisland --input=./templates --output=./dist" );
	out.push( "" );
	out.push( "arguments: " );
	out.push( "  --version" );
	out.push( "  --watch" );
	out.push( "       Wait for files to change and automatically rewrite." );
	out.push( "  --input" );
	out.push( "       Input template files (default: `templates`)" );
	out.push( "  --output" );
	out.push( "       Write HTML output to this folder (default: `dist`)" );
	out.push( "  --help" );
	out.push( "       Show this message." );
	console.log( out.join( "\n" ) );
} else if( argv.watch ) {
	console.log( "Watching…" );
	var watcher = watch(files.concat(cfg.dataFileName));

	watcher.on("change", function(path, stat) {
		console.log("File changed:", path);
		writer.write();
	});

	watcher.on("add", function(path, stat) {
		console.log("File added:", path);
		writer.write();
	});
} else {
	writer.write();
	console.log( "Finished in", (((new Date()) - start)/1000).toFixed(2),"seconds" );
}

