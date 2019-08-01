exports.data = async function() {
  return new Promise((resolve, reject) => {
    setTimeout(function() {
      resolve({ name: "Ted" });
    }, 100);
  });
};

exports.render = async function({ name }) {
  return new Promise((resolve, reject) => {
    setTimeout(function() {
      resolve(`<p>${name}</p>`);
    }, 100);
  });
};
