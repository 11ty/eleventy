module.exports = function (eleventyConfig) {
  const key = "views";
  const newPath =
    "./test/stubs-render-dynamic-paths/plugin/themes/plugin-theme/";

  // plugins are processed after config file, but the path needs to be at the end of the array
  if (eleventyConfig.paths[key]) {
    eleventyConfig.paths[key].push(newPath);
  } else {
    eleventyConfig.path(key, newPath);
  }
};
