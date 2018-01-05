#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const EleventyNodeVersionCheck = require("./src/VersionCheck");

EleventyNodeVersionCheck().then(function() {
  const Eleventy = require("./src/Eleventy");

  let eleven = new Eleventy(argv.input, argv.output);
  eleven.setFormats(argv.formats);
  eleven.setIsVerbose(!argv.quiet);

  eleven.init().then(function() {
    if (argv.version) {
      console.log(eleven.getVersion());
    } else if (argv.help) {
      console.log(eleven.getHelp());
    } else if (argv.watch) {
      eleven.watch();
    } else {
      eleven.write().then(function() {
        console.log(eleven.getFinishedLog());
      });
    }
  });
});
