export default function myFunction({ name }) {
  return `<p>${this.upper(name)}${myFunction.staticMethod()}</p>`;
}

myFunction.staticMethod = function () {
  return "T9000";
};
