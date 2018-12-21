class Test {
  data() {
    return {
      name: "Zach",
      otherFn: function() {
        return "Thanos";
      },
      renderData: {
        str: `StringTest`,
        test: function({ name }) {
          return `howdy ${name}`;
        }
      }
    };
  }

  render(data) {
    return `<p>${data.renderData.str}${
      data.renderData.test
    }, meet ${data.otherFn()}</p>`;
  }
}

module.exports = Test;
