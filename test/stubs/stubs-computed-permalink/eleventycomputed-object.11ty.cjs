module.exports.data = {
  lang: "en",
  eleventyComputed: {
    permalink: {
      build: function (data) {
        return `/i18n/${data.lang}/`;
      },
    },
  },
};
