module.exports.data = {
  eleventyComputed: {
    venues: (data) => {
      return data.collections.venue;
    },
  },
};
