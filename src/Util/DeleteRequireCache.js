const path = require("path");
const { TemplatePath } = require("@11ty/eleventy-utils");
const debug = require("debug")("Eleventy:DeleteRequireCache");

/**
 * Removes a nodejs module from the cache.
 * The keys of the nodejs require cache are file paths based on the current operating system.
 * @param {string} absolutePath An absolute POSIX path to the file.
 */
function deleteRequireCacheAbsolute(absolutePath) {
  const normalizedPath = path.normalize(absolutePath);
  debug("Deleting %o from `require` cache.", normalizedPath);
  delete require.cache[normalizedPath];
}

function deleteRequireCache(localPath) {
  let absolutePath = TemplatePath.absolutePath(localPath);
  deleteRequireCacheAbsolute(absolutePath);
}

module.exports = deleteRequireCache; // will transform local paths to absolute

// Export for testing only
module.exports.deleteRequireCacheAbsolute = deleteRequireCacheAbsolute;
