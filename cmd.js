#!/usr/bin/env node
const watch = require("glob-watcher");
const argv = require( "minimist" )( process.argv.slice(2) );
const TemplateWriter = require("./src/TemplateWriter");

const cfg = require("./config.json");
// argv._ ? argv._ : 
const dir = cfg.dir.templates;

let writer = new TemplateWriter(
	cfg.templateFormats.map(function(extension) {
		return dir + "/*" + extension;
	}),
	cfg.dataFileName
);

writer.write();

if( argv.watch ) {
	console.log( "Watching…" );
	var watcher = watch(["./" + cfg.dir.templates + "/**", cfg.dataFileName]);
	watcher.on("change", function(path, stat) {
		console.log("File changed:", path);
		writer.write();
	});

	watcher.on("add", function(path, stat) {
		console.log("File added:", path);
		writer.write();
	});
}
