module.exports = async function(data) {
  return new Promise((resolve, reject) => {
    setTimeout(function() {
      resolve(`<p>${data.name}</p>`);
    }, 100);
  });
};
