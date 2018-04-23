module.exports = (str, options) => {
  options = {
    lowercaseRestOfWord: false,
    ...options
  };

  const _captilize = word => {
    const firstLetterCapitalized = word.substr(0, 1).toUpperCase();
    const restOfWords = options.lowercaseRestOfWord
      ? word.substr(1).toLowerCase()
      : word.substr(1);

    return `${firstLetterCapitalized}${restOfWords}`;
  };

  return str
    .split(" ")
    .map(_captilize)
    .join(" ");
};
