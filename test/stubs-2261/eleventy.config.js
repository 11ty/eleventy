export default function(eleventyConfig) {
  eleventyConfig.addPairedShortcode("sample", function(content, firstName) {
      return `${content} ${firstName}`
  });
};