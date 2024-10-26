class Test {
  get data() {
    return {
      key: "value1",
      permalink: async function(data) {
        return new Promise((resolve, reject) => {
          setTimeout(function() {
            resolve(`/my-permalink/${data.key}/`);
          }, 100);
        });
      }
    };
  }

  render({ name }) {
    return `<p>${name}</p>`;
  }
}

module.exports = Test;
