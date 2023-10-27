class Tmpl {
  data() {
    return {
      argData: {
        hi: "javascriptHi",
        bye: "javascriptBye",
      },
    };
  }

  async render(data) {
    return this.renderTemplate(
      `
# Markdown
{% assign t1 = 2 %}
* {{ t1 }}
`,
      "liquid,md",
      data.argData
    );
  }
}
module.exports = Tmpl;
