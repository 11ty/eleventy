export default class Tmpl {
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
* {{ hi | reverse }}
`,
      "njk",
      data.argData
    );
  }
}
