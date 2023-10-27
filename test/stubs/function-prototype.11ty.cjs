function myFunction() {}

myFunction.prototype.render = function({ name }) {
  return `<p>${this.upper(
    name
  )}${this.returnsBill()}${myFunction.staticMethod()}</p>`;
};

myFunction.prototype.returnsBill = function() {
  return "Bill";
};

myFunction.staticMethod = function() {
  return "T9001";
};

module.exports = myFunction;
