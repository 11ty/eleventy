const pkg = require("../package.json");
const versionCheck = require("check-node-version");

/*
 * This file should have maximum compatibility to ensure node checks can
 * report requirements on unsupported versions.
 */
module.exports = function() {
  return new Promise(function(resolve, reject) {
    // Try the .versionCheck in EleventyConfig
    try {
      require("./Config");
    } catch (e) {
      reject(e.toString());
    }

    versionCheck({ node: pkg.engines.node }, function(err, result) {
      if (!result.versions.node.isSatisfied) {
        reject(
          "Eleventy requires Node version 8 or above. You’re currently using " +
            result.versions.node.version +
            "."
        );
      } else {
        resolve();
      }
    });
  });
};
