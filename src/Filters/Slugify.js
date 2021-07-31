const slugify = require("@sindresorhus/slugify");

module.exports = function (str, options = {}) {
  return slugify(
    "" + str,
    Object.assign(
      {
        decamelize: false,
      },
      options
    )
  );
};
