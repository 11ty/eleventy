exports.data = {
  pages: ["page 1"],
  pagination: {
    data: "pages",
    size: 1,
  },
};

exports.render = (data) => `${data.banner.content}`;
