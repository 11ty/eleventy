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
    string: ["input", "output", "formats", "config", "pathprefix", "port", "to"],
    boolean: [
      "quiet",
      "version",
      "watch",
      "dryrun",
      "help",
      "serve",
      "incremental",
      "ignore-initial",
    ],
    default: {
      quiet: null,
      "ignore-initial": false,
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
    errorHandler.warn(promise, "A promise rejection was handled asynchronously");
  });

  if (argv.version) {
    console.log(Eleventy.getVersion());
  } else if (argv.help) {
    console.log(Eleventy.getHelp());
  } else {
    let elev = new Eleventy(argv.input, argv.output, {
      source: "cli",
      // --quiet and --quiet=true both resolve to true
      quietMode: argv.quiet,
      configPath: argv.config,
      pathPrefix: argv.pathprefix,
      runMode: argv.serve ? "serve" : argv.watch ? "watch" : "build",
    });

    // reuse ErrorHandler instance in Eleventy
    errorHandler = elev.errorHandler;

    if (argv.to === "json" || argv.to === "ndjson") {
      // override logging output
      elev.setIsVerbose(false);
    }

    elev.setDryRun(argv.dryrun);
    elev.setIgnoreInitial(argv["ignore-initial"]);
    elev.setIncrementalBuild(argv.incremental);
    elev.setFormats(argv.formats);

    // careful, we can’t use async/await here to error properly
    // with old node versions in `please-upgrade-node` above.
    elev
      .init()
      .then(function () {
        try {
          if (argv.serve) {
            let shouldStartServer = true;
            elev
              .watch()
              .catch((e) => {
                // Build failed but error message already displayed.
                shouldStartServer = false;
                // A build error occurred and we aren’t going to --serve
              })
              .then(function () {
                if (shouldStartServer) {
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
