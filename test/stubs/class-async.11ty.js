export default class Test {
  async render({ name }) {
    return Promise.resolve(`<p>${name}</p>`);
  }
}
