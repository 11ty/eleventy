const slugify = require("@sindresorhus/slugify");

module.exports = function (str, options = {}) {
  return slugify(
    "" + str,
    Object.assign(
      {
        // lowercase: true, // default
        decamelize: false,
      },
      options
    )
  );
};
