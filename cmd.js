#!/usr/bin/env node
if (process.env.DEBUG) {
  require("time-require");
}

const argv = require("minimist")(process.argv.slice(2));
const EleventyNodeVersionCheck = require("./src/VersionCheck");

EleventyNodeVersionCheck().then(
  function() {
    const chalk = require("chalk");
    const Eleventy = require("./src/Eleventy");
    const EleventyCommandCheck = require("./src/EleventyCommandCheck");

    try {
      let cmdCheck = new EleventyCommandCheck(argv);
      cmdCheck.hasUnknownArguments();
    } catch (e) {
      console.log(chalk.red("Eleventy error:"), chalk.red(e.toString()));
      return;
    }

    try {
      let elev = new Eleventy(argv.input, argv.output);
      elev.setConfigPath(argv.config);
      elev.setPathPrefix(argv.pathprefix);
      elev.setDryRun(argv.dryrun);
      elev.setFormats(argv.formats);

      let isVerbose = process.env.DEBUG ? false : !argv.quiet;
      elev.setIsVerbose(isVerbose);

      elev.init().then(function() {
        if (argv.version) {
          console.log(elev.getVersion());
        } else if (argv.help) {
          console.log(elev.getHelp());
        } else if (argv.serve) {
          elev.watch().then(function() {
            elev.serve(argv.port);
          });
        } else if (argv.watch) {
          elev.watch();
        } else {
          elev.write();
        }
      });
    } catch (e) {
      console.log(chalk.red("Eleventy error:"), e);
    }
  },
  function(error) {
    // EleventyNodeVersionCheck rejection
    const chalk = require("chalk");
    console.log(chalk.red(error.toString()));
  }
);
