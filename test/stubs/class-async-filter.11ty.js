class Test {
  returnsBill() {
    return "Bill";
  }

  async render({ name }) {
    return Promise.resolve(`<p>${this.upper(name)}${this.returnsBill()}</p>`);
  }
}

module.exports = Test;
