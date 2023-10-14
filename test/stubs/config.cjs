const pretty = require("pretty");

module.exports = function (config) {
  /* {
    template,
    inputPath,
    outputPath,
    url,
    data,
    date
  } */

  return {
    markdownTemplateEngine: "njk",
    templateFormats: ["md", "njk"],

    pathPrefix: "/testdir",

    keys: {
      package: "pkg2",
    },
    transforms: {
      prettyHtml: function (str, outputPath) {
        if (outputPath.split(".").pop() === "html") {
          return pretty(str, { ocd: true });
        } else {
          return str;
        }
      },
    },
    nunjucksFilters: {
      testing: (str) => {
        return str;
      },
    },
  };
};
