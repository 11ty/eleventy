const viperHTML = require("viperhtml");

// Returns buffer
module.exports = function(data) {
  return viperHTML.wire()`<div>
  This is a viper template, ${data.name}
  ${[data.html]}
</div>`;
};
