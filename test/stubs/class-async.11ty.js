class Test {
  async render({ name }) {
    return Promise.resolve(`<p>${name}</p>`);
  }
}

module.exports = Test;
