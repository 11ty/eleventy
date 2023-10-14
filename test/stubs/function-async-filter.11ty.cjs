module.exports = async function({ name }) {
  return `<p>${await this.upper(name)}</p>`;
};
