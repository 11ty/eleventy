export default class Test {
  get data() {
    return {
      permalink: "/my-permalink/",
    };
  }

  render({ name }) {
    return `<p>${name}</p>`;
  }
}
