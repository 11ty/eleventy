/**
 * Capitalize a given string.
 *
 * @param {string} str - The string to capitalize.
 * @param {Object} options - Additional options.
 * @param {boolean} options.lowercaseRestOfWord - The only recognised option. Transform the rest of the input?
 * @returns {string} The transformed string.
 */
module.exports = function (str, options) {
  options = Object.assign(
    {
      lowercaseRestOfWord: false,
    },
    options
  );

  return str
    .split(" ")
    .map(function (word) {
      return (
        word.substr(0, 1).toUpperCase() +
        (options.lowercaseRestOfWord
          ? word.substr(1).toLowerCase()
          : word.substr(1))
      );
    })
    .join(" ");
};
