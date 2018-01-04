#!/usr/bin/env node
const argv = require("minimist")(process.argv.slice(2));
const versionCheck = require("check-node-version");

function EleventyNodeVersionCheck() {
  return new Promise(function(resolve, reject) {
    versionCheck({ node: "8.x.x" }, function(err, result) {
      if (!result.versions.node.isSatisfied) {
        console.log(
          "Eleventy requires Node version 8 or above. You’re currently using " +
            result.versions.node.version +
            "."
        );
      } else {
        resolve();
      }
    });
  });
}

EleventyNodeVersionCheck().then(function() {
  const Eleventy = require("./src/Eleventy");

  let eleven = new Eleventy(argv.input, argv.output);
  eleven.setFormats(argv.formats);
  eleven.setIsVerbose(!argv.quiet);

  eleven.init().then(function() {
    if (argv.version) {
      console.log(eleven.getVersion());
    } else if (argv.help) {
      console.log(eleven.getHelp());
    } else if (argv.watch) {
      eleven.watch();
    } else {
      eleven.write().then(function() {
        console.log(eleven.getFinishedLog());
      });
    }
  });
});
