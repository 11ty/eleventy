module.exports.data = {
  lang: "en",
  eleventyComputed: {
    permalink: function (data) {
      // console.log(">>>>", { data });
      return {
        build: `/i18n/${data.lang}/`,
      };
    },
  },
};
