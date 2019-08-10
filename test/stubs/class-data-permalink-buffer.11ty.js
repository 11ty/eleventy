class Test {
  get data() {
    return {
      permalink: Buffer.from("/my-permalink/")
    };
  }

  render({ name }) {
    return `<p>${name}</p>`;
  }
}

module.exports = Test;
