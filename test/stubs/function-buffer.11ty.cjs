module.exports = function(data) {
  return Buffer.from(`<p>${data.name}</p>`);
};
