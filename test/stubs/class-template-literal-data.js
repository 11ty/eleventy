class Test {
  get data() {
    return {
      name: "Ted"
    };
  }

  render(data) {
    return `<p>${data.name}</p>`;
  }
}

module.exports = Test;
