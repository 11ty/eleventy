#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const EleventyNodeVersionCheck = require("./src/VersionCheck");

EleventyNodeVersionCheck().then(function() {
  const Eleventy = require("./src/Eleventy");

  let elev = new Eleventy(argv.input, argv.output);
  elev.setFormats(argv.formats);
  elev.setIsVerbose(!argv.quiet);

  elev.init().then(function() {
    if (argv.version) {
      console.log(elev.getVersion());
    } else if (argv.help) {
      console.log(elev.getHelp());
    } else if (argv.watch) {
      elev.watch();
    } else {
      elev.write().then(function() {
        console.log(elev.getFinishedLog());
      });
    }
  });
});
