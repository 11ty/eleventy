export default function (data) {
  return Buffer.from(`<p>${data.name}</p>`);
}
