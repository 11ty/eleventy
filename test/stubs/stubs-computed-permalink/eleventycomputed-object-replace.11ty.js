module.exports.data = {
  lang: "en",
  permalink: "/i18n/{{lang}}/",
  eleventyComputed: {
    permalink: function (data) {
      return {
        serverless: data.permalink.replace("{{lang}}", "en"),
      };
    },
  },
};
