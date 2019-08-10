class Test {
  get data() {
    return {
      name: "Ted"
    };
  }

  render({ name }) {
    return `<p>${this.upper(name)}</p>`;
  }
}

module.exports = Test;
