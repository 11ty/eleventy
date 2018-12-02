class Test {
  returnsBill() {
    return "Bill";
  }

  render({ name }) {
    return `<p>${name}${this.returnsBill()}</p>`;
  }
}

module.exports = Test;
