module.exports.data = {
  lang: "en",
  permalink: function (data) {
    return {
      serverless: `/i18n/${data.lang}/`,
    };
  },
};
