module.exports = async function(data) {
  return `<p>${await this.upper(data.name)}</p>`;
};
