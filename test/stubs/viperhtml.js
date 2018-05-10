const viperHTML = require("viperhtml");

module.exports = function(data) {
  return (
    "" +
    viperHTML.wire()`<div>
  This is a viper template, ${data.name}
  ${[data.html]}
</div>`
  );
};
