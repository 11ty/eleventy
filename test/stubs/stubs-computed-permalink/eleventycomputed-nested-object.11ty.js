module.exports.data = {
  lang: "en",
  eleventyComputed: {
    permalink: function (data) {
      return {
        serverless: `/i18n/${data.lang}/`,
      };
    },
  },
};
