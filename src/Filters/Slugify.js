const slugify = require("@sindresorhus/slugify");

module.exports = function(str, options = {}) {
  return slugify(str, options);
};
