export const data = {
  lang: "en",
  permalink: function (data) {
    return {
      serverless: `/i18n/${data.lang}/`,
    };
  },
};
