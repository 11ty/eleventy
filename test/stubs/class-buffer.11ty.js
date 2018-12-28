class Test {
  returnsBill() {
    return "Bill";
  }

  static returnsTed() {
    return "Ted";
  }

  render({ name }) {
    return Buffer.from(
      `<p>${name}${this.returnsBill()}${Test.returnsTed()}</p>`
    );
  }
}

module.exports = Test;
