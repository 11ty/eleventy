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

  let errorHandler = new EleventyErrorHandler();

  process.on("unhandledRejection", (error, promise) => {
    errorHandler.error(error, `Unhandled rejection in promise (${promise})`);
  });
  process.on("uncaughtException", (error) => {
    errorHandler.fatal(error, "Uncaught exception");
  });
  process.on("rejectionHandled", (promise) => {
    errorHandler.warn(
      promise,
      "A promise rejection was handled asynchronously"
    );
  });

  let elev = new Eleventy(argv.input, argv.output, {
    // --quiet and --quiet=true both resolve to true
    quietMode: argv.quiet,
  });

  // reuse ErrorHandler instance in Eleventy
  errorHandler = elev.errorHandler;

  if (argv.to === "json" || argv.to === "ndjson") {
    // override logging output
    elev.setIsVerbose(false);
  }

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
        if (argv.to === "json") {
          elev.toJSON().then(function (result) {
            console.log(JSON.stringify(result, null, 2));
          });
        } else if (argv.to === "ndjson") {
          elev
            .toNDJSON()
            .then(function (stream) {
              stream
                .on("data", function (jsonString) {
                  console.log(jsonString);
                })
                .on("error", errorHandler.fatal.bind(errorHandler));
            })
            .catch(errorHandler.fatal.bind(errorHandler));
        } else if (!argv.to || argv.to === "fs") {
          elev.write();
        } else {
          throw new EleventyCommandCheckError(
            `Invalid --to value: ${argv.to}. Supported values: \`fs\`, \`json\`, and \`ndjson\`.`
          );
        }
      }
    })
    .catch(errorHandler.fatal.bind(errorHandler));
} catch (e) {
  errorHandler.fatal(e, "Eleventy fatal error");
}
