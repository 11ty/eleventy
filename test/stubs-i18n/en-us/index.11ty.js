module.exports = function (data) {
  return `${this.locale_url("/")}
${this.locale_url("/en-us/")}
${this.locale_url("/es/")}
${this.locale_url("/", "es")}
${this.locale_url("/non-lang-file/")}
${JSON.stringify(this.locale_links(data.page.url).sort())}
${JSON.stringify(this.locale_links().sort())}
${data.page.lang}`;
};
