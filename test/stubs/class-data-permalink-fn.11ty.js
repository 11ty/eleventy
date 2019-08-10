class Test {
  get data() {
    return {
      key: "value1",
      permalink: data => `/my-permalink/${data.key}/`
    };
  }

  render({ name }) {
    return `<p>${name}</p>`;
  }
}

module.exports = Test;
