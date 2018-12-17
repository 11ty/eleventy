const Dep = require("./class-with-dep-upstream.js");

class Test {
  returnsBill() {
    return "Bill";
  }

  static returnsTed() {
    return "Ted";
  }

  render({ name }) {
    return `<p>${name}${this.returnsBill()}${Test.returnsTed()}</p>`;
  }
}

module.exports = Test;
