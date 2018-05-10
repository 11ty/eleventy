#!/usr/bin/env node

const chalk = require("chalk");
const argv = require("minimist")(process.argv.slice(2));
const EleventyNodeVersionCheck = require("./src/VersionCheck");
const Eleventy = require("./src/Eleventy");
const EleventyCommandCheck = require("./src/EleventyCommandCheck");

if (process.env.DEBUG) {
  require("time-require");
}

(async () => {
  try {
    await EleventyNodeVersionCheck();
  } catch (e) {
    return console.log(chalk.red(e.toString()));
  }

  let cmdCheck = new EleventyCommandCheck(argv);

  try {
    await cmdCheck.hasUnknownArguments();
  } catch (e) {
    return console.log(chalk.red(e.toString()));
  }
})();

/**
 * Setup Eleventy
 */
async function setupEleventy() {
  let elev = new Eleventy(argv.input, argv.output);
  elev.setConfigPath(argv.config);
  elev.setPathPrefix(argv.pathprefix);
  elev.setDryRun(argv.dryrun);
  elev.setFormats(argv.formats);

  let isVerbose = process.env.DEBUG ? false : !argv.quiet;
  elev.setIsVerbose(isVerbose);

  try {
    await elev.init();
  } catch (e) {
    return console.log(chalk.red(e.toString));
  }

  if (argv.version) {
    console.log(elev.getVersion());
  } else if (argv.help) {
    console.log(elev.getHelp());
  } else if (argv.serve) {
    try {
      await elev.watch();
      const serve = require("serve");
      const server = serve(elev.getOutputDir(), {
        port: argv.port || 8080,
        ignore: ["node_modules"]
      });

      process.on("SIGINT", function() {
        server.stop();
        process.exit();
      });
    } catch (e) {
      console.log(chalk.red(e.toString()));
    }
  } else if (argv.watch) {
    elev.watch();
  } else {
    elev.write().then(function() {
      // do something custom if you want
    });
  }
}

setupEleventy();
