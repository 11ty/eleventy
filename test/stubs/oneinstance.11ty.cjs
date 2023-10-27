class Test {
  constructor() {
    this.rand = Math.random();
  }

  get data() {
    return {
      name: "Ted",
      rand: this.rand
    };
  }

  render({ name }) {
    return `<p>${name}${this.rand}</p>`;
  }
}

module.exports = Test;
