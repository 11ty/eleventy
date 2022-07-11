module.exports = function (data) {
  return `${this.locale_url("/")}
${this.locale_url("/non-lang-file/")}
${this.locale_links(data.page.inputPath).sort()}`;
};
