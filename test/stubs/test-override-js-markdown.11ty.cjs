class Test {
  data() {
    return {
      name: "markdown",
      templateEngineOverride: "11ty.js,md"
    };
  }

  render(data) {
    return `# This is ${data.name}`;
  }
}

module.exports = Test;
