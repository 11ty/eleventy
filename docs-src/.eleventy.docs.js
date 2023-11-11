import { dirname } from "path";
import { fileURLToPath } from "url";
import { TemplatePath } from "@11ty/eleventy-utils";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  templateFormats: ["njk"],
  dir: {
    input: "docs-src",
    data: "_data",
    output: "docs",
  },
  nunjucksFilters: {
    removeDir: function (str) {
      return TemplatePath.stripLeadingSubPath(str, TemplatePath.join(__dirname, ".."));
    },
  },
};
