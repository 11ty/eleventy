class Test {
  get data() {
    return {
      key: "value1",
      permalink: data => Buffer.from(`/my-permalink/${data.key}/`)
    };
  }

  render({ name }) {
    return `<p>${name}</p>`;
  }
}

module.exports = Test;
