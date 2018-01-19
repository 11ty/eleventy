const pretty = require("pretty");

module.exports = function(config) {
  // config.on("alldata", function(dataMap) {
  //   console.log( "alldata", dataMap );
  // });

  /* {
    template,
    inputPath,
    outputPath,
    url,
    data,
    date
  } */
  config.addCollection("postDescendingByDate", function(collection) {
    return collection.getFilteredByTag("post").sort(function(a, b) {
      return a.date - b.date;
    });
  });

  return {
    markdownTemplateEngine: "ejs",
    templateFormats: ["md", "njk"],
    keys: {
      package: "pkg2"
    },
    filters: {
      prettyHtml: function(str, outputPath) {
        if (outputPath.split(".").pop() === "html") {
          return pretty(str, { ocd: true });
        } else {
          return str;
        }
      }
    },
    nunjucksFilters: {
      testing: str => {
        return str;
      }
    }
  };
};
