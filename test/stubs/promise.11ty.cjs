module.exports = new Promise((resolve, reject) => {
  setTimeout(function() {
    resolve("<p>Zach</p>");
  }, 100);
});
