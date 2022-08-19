export default class Test {
  data = {
    name: "Ted",
  };

  render({ name }) {
    return `<p>${name}</p>`;
  }
}
