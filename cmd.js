#!/usr/bin/env node
const pkg = require("./package.json");
require("please-upgrade-node")(pkg, {
  message: function (requiredVersion) {
    return (
      "Eleventy requires Node " +
      requiredVersion +
      ". You will need to upgrade Node to use Eleventy!"
    );
  },
});
const debug = require("debug")("Eleventy:cmd");

const EleventyErrorHandler = require("./src/EleventyErrorHandler");

try {
  let errorHandler = new EleventyErrorHandler();
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

  debug("command: eleventy %o", argv);
  const Eleventy = require("./src/Eleventy");

  process.on("unhandledRejection", (error, promise) => {
    errorHandler.fatal(error, "Unhandled rejection in promise");
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
    configPath: argv.config,
    source: "cli",
  });

  // reuse ErrorHandler instance in Eleventy
  errorHandler = elev.errorHandler;

  if (argv.version) {
    console.log(elev.getVersion());
  } else if (argv.help) {
    console.log(elev.getHelp());
  } else {
    if (argv.to === "json" || argv.to === "ndjson") {
      // override logging output
      elev.setIsVerbose(false);
    }

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
        try {
          if (argv.serve) {
            let startBrowsersync = true;
            elev
              .watch()
              .catch((e) => {
                // Build failed but error message already displayed.
                startBrowsersync = false;
                // A build error occurred and we aren’t going to --serve
              })
              .then(function () {
                if (startBrowsersync) {
                  elev.serve(argv.port);
                }
              });
          } else if (argv.watch) {
            elev.watch().catch((e) => {
              // A build error occurred and we aren’t going to --watch
            });
          } else {
            if (argv.to === "json") {
              elev.toJSON().then(function (result) {
                console.log(JSON.stringify(result, null, 2));
              });
            } else if (argv.to === "ndjson") {
              elev.toNDJSON().then(function (stream) {
                stream.pipe(process.stdout);
              });
            } else if (!argv.to || argv.to === "fs") {
              elev.write();
            } else {
              throw new EleventyCommandCheckError(
                `Invalid --to value: ${argv.to}. Supported values: \`fs\` (default), \`json\`, and \`ndjson\`.`
              );
            }
          }
        } catch (e) {
          errorHandler.fatal(e, "Eleventy CLI Error");
        }
      })
      .catch(errorHandler.fatal.bind(errorHandler));
  }
} catch (e) {
  let errorHandler = new EleventyErrorHandler();
  errorHandler.fatal(e, "Eleventy CLI Fatal Error");
}
