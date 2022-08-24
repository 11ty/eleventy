export const data = {
  pages: ["page 1"],
  pagination: {
    data: "pages",
    size: 1,
  },
};

export function render(data) { return `${data.banner.content}`; }
