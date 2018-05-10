const slugify = require("slugify");

module.exports = str =>
  slugify(str, {
    replacement: "-",
    lower: true
  });
