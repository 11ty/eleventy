module.exports = async function() {
  return new Promise(resolve => {
    setTimeout(function() {
      resolve({
        localdatakeyfromjs: "howdydoody"
      });
    }, 1);
  });
};
