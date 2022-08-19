export default class Test {
  data() {
    return {
      name: "Ted",
    };
  }

  render({ name }) {
    return `<p>${name}</p>`;
  }
}
