import { TemplatePath } from "@11ty/eleventy-utils";

export const templateFormats = ["njk"];
export const dir = {
  input: "docs-src",
  data: "_data",
  output: "docs",
};
export const nunjucksFilters = {
  removeDir: function (str) {
    return TemplatePath.stripLeadingSubPath(
      str,
      TemplatePath.join(__dirname, "..")
    );
  },
};
