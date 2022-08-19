export default async function (data) {
  return `<p>${await this.upper(data.name)}</p>`;
}
