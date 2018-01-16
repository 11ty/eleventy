#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const EleventyNodeVersionCheck = require("./src/VersionCheck");
const debug = require("debug")("Eleventy-CLI");

EleventyNodeVersionCheck().then(function() {
  const Eleventy = require("./src/Eleventy");
  debug(
    "command: eleventy" +
      (argv.input ? " --input=" + argv.input : "") +
      (argv.output ? " --output=" + argv.output : "") +
      (argv.formats ? " --formats=" + arg.formats : "") +
      (argv.config ? " --config=" + arg.config : "") +
      (argv.quiet ? " --quiet" : "") +
      (argv.version ? " --version" : "") +
      (argv.watch ? " --watch" : "")
  );

  let elev = new Eleventy(argv.input, argv.output);
  elev.setConfigPath(argv.config);
  elev.setFormats(argv.formats);

  if (process.env.DEBUG) {
    elev.setIsVerbose(false);
  } else {
    elev.setIsVerbose(!argv.quiet);
  }

  elev.init().then(function() {
    if (argv.version) {
      console.log(elev.getVersion());
    } else if (argv.help) {
      console.log(elev.getHelp());
    } else if (argv.watch) {
      elev.watch();
    } else {
      elev.write().then(function() {
        // do something custom if you want
      });
    }
  });
});
