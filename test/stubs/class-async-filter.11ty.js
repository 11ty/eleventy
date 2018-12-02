class Test {
  static returnsTed() {
    return "Ted";
  }

  returnsBill() {
    return "Bill";
  }

  async render({ name }) {
    return Promise.resolve(
      `<p>${this.upper(name)}${this.returnsBill()}${Test.returnsTed()}</p>`
    );
  }
}

module.exports = Test;
