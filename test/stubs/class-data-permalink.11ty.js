class Test {
  get data() {
    return {
      permalink: "/my-permalink/"
    };
  }
  // TODO permalink: function() {}

  render({ name }) {
    return `<p>${name}</p>`;
  }
}

module.exports = Test;
