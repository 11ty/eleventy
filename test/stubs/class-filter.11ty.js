class Test {
  static returnsTed() {
    return "Ted";
  }

  returnsBill() {
    return "Bill";
  }

  render({ name }) {
    return `<p>${this.upper(
      name
    )}${this.returnsBill()}${Test.returnsTed()}</p>`;
  }
}

module.exports = Test;
