const path = require("path");

/**
 * Removes a nodejs module from the cache.
 * The keys of the nodejs require cache are file paths based on the current operating system.
 * @param {string} absoluteModulePath An absolute POSIX path to the module.
 */
module.exports = function deleteRequireCache(absoluteModulePath) {
  const normalizedPath = path.normalize(absoluteModulePath);
  delete require.cache[normalizedPath];
};
