module.exports = function (eleventyConfig) {
  eleventyConfig.addTransform("transform-html", function (content) {
    return `${content}`.trim() + "<p>Hi</p>";
  });
};
