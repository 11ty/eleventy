const slugify = require("slugify");

module.exports = function (str, options = {}) {
  return slugify(
    "" + str,
    Object.assign(
      {
        replacement: "-",
        lower: true,
      },
      options
    )
  );
};
