module.exports = {
  eleventyNavigation: {
    key: data => {
      return "nested-first-global";
    }
  },
  image2: data => {
    return "second-global";
  },
  image3: data => {
    return "third-global";
  }
};
