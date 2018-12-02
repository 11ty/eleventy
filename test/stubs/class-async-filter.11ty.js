class Test {
  async render({ name }) {
    return Promise.resolve(`<p>${this.upper(name)}</p>`);
  }
}

module.exports = Test;
