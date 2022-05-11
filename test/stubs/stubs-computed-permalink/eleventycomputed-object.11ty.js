module.exports.data = {
  lang: "en",
  eleventyComputed: {
    permalink: {
      serverless: function (data) {
        return `/i18n/${data.lang}/`;
      },
    },
  },
};
