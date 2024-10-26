const data = {
  pages: ["page 1"],
  pagination: {
    data: "pages",
    size: 1,
  },
};

const render = (data) => `${data.banner.content}`;

export { data, render };
