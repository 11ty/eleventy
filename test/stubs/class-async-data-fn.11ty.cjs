class Test {
  async data() {
    return new Promise((resolve, reject) => {
      setTimeout(function() {
        resolve({
          name: "Ted"
        });
      }, 50);
    });
  }

  render({ name }) {
    return `<p>${name}</p>`;
  }
}

module.exports = Test;
