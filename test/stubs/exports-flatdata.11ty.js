// This is invalid, data must be an object
export const data = "Ted";

export function render(name) {
  return `<p>${JSON.stringify(name)}</p>`;
}
