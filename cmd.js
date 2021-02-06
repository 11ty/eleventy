#!/usr/bin/env node
const pkg = require("./package.json");
const chalk = require("chalk"); // node 8+
require("please-upgrade-node")(pkg, {
  message: function (requiredVersion) {
    return chalk.red(
      `Eleventy requires Node ${requiredVersion}. You’ll need to upgrade to use it!`
    );
  },
});
const debug = require("debug")("Eleventy:cmd");

if (process.env.DEBUG) {
  require("time-require");
}

const EleventyErrorHandler = require("./src/EleventyErrorHandler");

try {
  const EleventyCommandCheckError = require("./src/EleventyCommandCheckError");
  const argv = require("minimist")(process.argv.slice(2), {
    string: [
      "input",
      "output",
      "formats",
      "config",
      "pathprefix",
      "port",
      "to",
    ],
    boolean: [
      "quiet",
      "version",
      "watch",
      "dryrun",
      "help",
      "serve",
      "passthroughall",
      "incremental",
    ],
    default: {
      quiet: null,
    },
    unknown: function (unknownArgument) {
      throw new EleventyCommandCheckError(
        `We don’t know what '${unknownArgument}' is. Use --help to see the list of supported commands.`
      );
    },
  });
  debug("command: eleventy ", argv.toString());
  const Eleventy = require("./src/Eleventy");

  process.on("unhandledRejection", (error, promise) => {
    EleventyErrorHandler.error(
      error,
      `Unhandled rejection in promise (${promise})`
    );
  });
  process.on("uncaughtException", (error) => {
    EleventyErrorHandler.fatal(error, "Uncaught exception");
  });
  process.on("rejectionHandled", (promise) => {
    EleventyErrorHandler.warn(
      promise,
      "A promise rejection was handled asynchronously"
    );
  });

  let elev = new Eleventy(argv.input, argv.output, {
    // --quiet and --quiet=true both resolve to true
    quietMode: argv.quiet,
  });

  elev.setConfigPathOverride(argv.config);
  elev.setPathPrefix(argv.pathprefix);
  elev.setDryRun(argv.dryrun);
  elev.setIncrementalBuild(argv.incremental);
  elev.setPassthroughAll(argv.passthroughall);
  elev.setFormats(argv.formats);

  // careful, we can’t use async/await here to error properly
  // with old node versions in `please-upgrade-node` above.
  elev
    .init()
    .then(function () {
      if (argv.version) {
        console.log(elev.getVersion());
      } else if (argv.help) {
        console.log(elev.getHelp());
      } else if (argv.serve) {
        elev.watch().then(function () {
          elev.serve(argv.port);
        });
      } else if (argv.watch) {
        elev.watch();
      } else {
        if (argv.to !== "fs" && argv.to !== "json") {
          throw new EleventyCommandCheckError(
            `Invalid --to value: ${argv.to}. Supported values: \`fs\` and \`json\`.`
          );
        }

        let promise = elev.executeBuild(argv.to);

        if (argv.to === "json") {
          promise.then((result) => {
            console.log(result);
          });
        }
      }
    })
    .catch(EleventyErrorHandler.fatal);
} catch (e) {
  EleventyErrorHandler.fatal(e, "Eleventy fatal error");
}
