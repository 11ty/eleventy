const versionCheck = require("check-node-version");

module.exports = function() {
  return new Promise(function(resolve, reject) {
    versionCheck({ node: ">= 8.x.x" }, function(err, result) {
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
};
