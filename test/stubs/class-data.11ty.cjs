class Test {
  get data() {
    return {
      name: "Ted"
    };
  }

  render({ name }) {
    return `<p>${name}</p>`;
  }
}

module.exports = Test;
