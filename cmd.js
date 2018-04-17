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

    let isVerbose = process.env.DEBUG ? false : !argv.quiet;
    elev.setIsVerbose(isVerbose);

    elev.init().then(function() {
      if (argv.version) {
        console.log(elev.getVersion());
      } else if (argv.help) {
        console.log(elev.getHelp());
      } else if (argv.serve) {
        elev.watch().then(function() {
          const serve = require("serve");
          const server = serve(elev.getOutputDir(), {
            port: argv.port || 8080,
            ignore: ["node_modules"]
          });

          process.on("SIGINT", function() {
            server.stop();
            process.exit();
          });
        });
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
