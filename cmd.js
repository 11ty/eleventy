#!/usr/bin/env node
const pkg = require("./package.json");
const chalk = require("chalk"); // node 8+
require("please-upgrade-node")(pkg, {
  message: function(requiredVersion) {
    return chalk.red(
      `Eleventy requires Node ${requiredVersion}. You’ll need to upgrade to use it!`
    );
  }
});

if (process.env.DEBUG) {
  require("time-require");
}

const EleventyErrorHandler = require("./src/EleventyErrorHandler");

try {
  const argv = require("minimist")(process.argv.slice(2));
  const Eleventy = require("./src/Eleventy");
  const EleventyCommandCheck = require("./src/EleventyCommandCheck");

  process.on("unhandledRejection", (error, promise) => {
    EleventyErrorHandler.error(
      error,
      `Unhandled rejection in promise (${promise})`
    );
  });
  process.on("uncaughtException", error => {
    EleventyErrorHandler.fatal(error, "Uncaught exception");
  });
  process.on("rejectionHandled", promise => {
    EleventyErrorHandler.warn(
      promise,
      "A promise rejection was handled asynchronously"
    );
  });

  let cmdCheck = new EleventyCommandCheck(argv);
  cmdCheck.hasUnknownArguments();

  let elev = new Eleventy(argv.input, argv.output);
  elev.setConfigPathOverride(argv.config);
  elev.setPathPrefix(argv.pathprefix);
  elev.setDryRun(argv.dryrun);
  elev.setIncrementalBuild(argv.incremental);
  elev.setPassthroughAll(argv.passthroughall);
  elev.setFormats(argv.formats);
  if (argv.quiet) {
    elev.setIsVerbose(false);
  }

  // careful, we can’t use async/await here to error properly
  // with old node versions in `please-upgrade-node` above.
  elev
    .init()
    .then(function() {
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
    })
    .catch(EleventyErrorHandler.fatal);
} catch (e) {
  EleventyErrorHandler.fatal(e, "Eleventy fatal error");
}
