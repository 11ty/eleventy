export const data = {
  eleventyComputed: {
    venues: (data) => {
      return data.collections.venue;
    },
  },
};
