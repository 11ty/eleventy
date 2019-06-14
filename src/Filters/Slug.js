const slugify = require("slugify");

slugify.extend({'\'': '-'})
module.exports = function(str) {
  return slugify(str, {
    replacement: "-",
    lower: true
  });
};
