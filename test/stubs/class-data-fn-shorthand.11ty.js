function Test() {}

// this doesn’t return an object?? 🤡
// Test.prototype.data = () => { name: "Ted" };
Test.prototype.data = () => {
  return { name: "Ted" };
};
Test.prototype.render = ({ name }) => `<p>${name}</p>`;

/*
Test.prototype.data = function() {
  return { name: "Ted" };
};
Test.prototype.render = function(data) {
  return `<p>${data.name}</p>`;
}
*/

/*
// this isn’t valid syntax?? 🤡
class Test {
  data() => {
    name: "Ted"
  };

  render({ name }) => `<p>${name}</p>`;
}
*/

module.exports = Test;
