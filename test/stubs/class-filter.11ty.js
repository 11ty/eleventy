class Test {
  returnsBill() {
    return "Bill";
  }

  render({ name }) {
    return `<p>${this.upper(name)}${this.returnsBill()}</p>`;
  }
}

module.exports = Test;
