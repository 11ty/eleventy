// This is invalid, data must be an object
exports.data = "Ted";

exports.render = function(name) {
  return `<p>${JSON.stringify(name)}</p>`;
};
