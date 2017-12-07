#!/usr/bin/env node
const watch = require("glob-watcher");
const argv = require( "minimist" )( process.argv.slice(2) );
const normalize = require('normalize-path');
const TemplateData = require("./src/TemplateData");
const TemplateWriter = require("./src/TemplateWriter");
const cfg = require("./src/TemplateConfig");

const pkg = require("./package.json");

// No command line override for the local filename
let templateCfg = new TemplateConfig(require("./config.json"));
let cfg = templateCfg.getConfig();

// argv._ ? argv._ : 
let inputDir = argv.input ? argv.input : cfg.dir.input;

let formats = cfg.templateFormats;
if( argv.formats && argv.formats !== "*" ) {
	formats = argv.formats.split(",");
}

let start = new Date();

let data = new TemplateData(argv.data || cfg.globalDataFile );
let writer = new TemplateWriter(
	inputDir,
	argv.output || cfg.dir.output,
	formats,
	data
);

if( argv.version ) {
	console.log( pkg.version );
} else if( argv.help ) {
	let out = [];
	out.push( "usage: eleventy" );
	out.push( "       eleventy --watch" );
	out.push( "       eleventy --input=./templates --output=./dist" );
	out.push( "" );
	out.push( "arguments: " );
	out.push( "  --version" );
	out.push( "  --watch" );
	out.push( "       Wait for files to change and automatically rewrite." );
	out.push( "  --input" );
	out.push( "       Input template files (default: `templates`)" );
	out.push( "  --output" );
	out.push( "       Write HTML output to this folder (default: `dist`)" );
	out.push( "  --formats=liquid,md" );
	out.push( "       Whitelist only certain template types (default: `*`)" );
	out.push( "  --data" );
	out.push( "       Set your own global data file (default: `data.json`)" );
	// out.push( "  --config" );
	// out.push( "       Set your own local configuration file (default: `eleventy.config.js`)" );
	out.push( "  --help" );
	out.push( "       Show this message." );
	console.log( out.join( "\n" ) );
} else if( argv.watch ) {
	console.log( "Watching…" );
	var watcher = watch(writer.getFiles().concat(cfg.globalDataFile));

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

