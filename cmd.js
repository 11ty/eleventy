#!/usr/bin/env node
if (process.env.DEBUG) {
  require("time-require");
}

const argv = require("minimist")(process.argv.slice(2));
const EleventyNodeVersionCheck = require("./src/VersionCheck");

EleventyNodeVersionCheck().then(
  function() {
    const Eleventy = require("./src/Eleventy");
    const EleventyCommandCheck = require("./src/EleventyCommandCheck");

    let cmdCheck = new EleventyCommandCheck(argv);
    try {
      cmdCheck.hasUnknownArguments();
    } catch (e) {
      const chalk = require("chalk");
      console.log(chalk.red(e.toString()));
      return;
    }

    let elev = new Eleventy(argv.input, argv.output);
    elev.setConfigPath(argv.config);
    elev.setPathPrefix(argv.pathprefix);
    elev.setDryRun(argv.dryrun);
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
  },
  function(error) {
    // EleventyNodeVersionCheck rejection
    const chalk = require("chalk");
    console.log(chalk.red(error.toString()));
  }
);
