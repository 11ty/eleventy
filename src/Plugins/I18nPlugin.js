// pathPrefix note:
// When using `locale_url` filter with the `url` filter, `locale_url` must run first like
// `| locale_url | url`. If you run `| url | locale_url` it won’t match correctly.

// TODO improvement would be to throw an error if `locale_url` finds a url with the
// path prefix at the beginning? Would need a better way to know `url` has transformed a string
// rather than just raw comparison.
// e.g. --pathprefix=/en/ should return `/en/en/` for `/en/index.liquid`
const { DeepCopy } = require("../Util/Merge");
const bcp47Normalize = require("bcp-47-normalize");
const iso639 = require("iso-639-1");

class Comparator {
  // https://en.wikipedia.org/wiki/IETF_language_tag#Relation_to_other_standards
  // Requires a ISO-639-1 language code at the start (2 characters before the first -)
  static isLangCode(code) {
    let [s] = (code || "").split("-");
    return iso639.validate(s) && !!bcp47Normalize(code);
  }

  // Search for same input path files with only differing locale folders
  //    matches /en/about.html and /es/about.html
  // Folders can exist anywhere in the hierarchy!
  //    matches /testing/en/about.html and /testing/es/about.html

  // Returns an array of the first matched language codes in the path
  // [inputPathLangCode, inputPath2LangCode]
  static matchLanguageFolder(inputPath, inputPath2) {
    if (inputPath === inputPath2) {
      return false;
    }

    let langCodes = [];
    let s1 = inputPath.split("/");
    let s2 = inputPath2.split("/");
    for (let j = 0, k = s1.length; j < k; j++) {
      if (Comparator.isLangCode(s1[j]) && Comparator.isLangCode(s2[j])) {
        // Return the first match only
        if (langCodes.length === 0) {
          langCodes = [s1[j], s2[j]];
        }
        continue;
      }
      if (s1[j] !== s2[j]) {
        return false;
      }
    }

    return langCodes;
  }
}

function EleventyPlugin(eleventyConfig, opts = {}) {
  let options = DeepCopy(
    {
      defaultLanguage: "",
      filters: {
        url: "locale_url",
        links: "locale_links",
      },
      errorMode: "strict", // allow-fallback, never
    },
    opts
  );
  if (!options.defaultLanguage) {
    throw new Error(
      "You must specify a `defaultLanguage` in Eleventy’s Internationalization (I18N) plugin."
    );
  }

  let extensionMap;
  eleventyConfig.on("eleventy.extensionmap", (map) => {
    extensionMap = map;
  });

  function normalizeInputPath(inputPath) {
    if (extensionMap) {
      return extensionMap.removeTemplateExtension(inputPath);
    }
    return inputPath;
  }

  let contentMaps = {};
  eleventyConfig.on(
    "eleventy.contentMap",
    function ({ urlToInputPath, inputPathToUrl }) {
      contentMaps.urls = urlToInputPath;

      // map of input paths => array of localized urls
      let localeMap = {};
      let inputPaths = Object.keys(inputPathToUrl);

      // map of input paths without extensions
      let inputPathsWithoutTemplateExtensionsMap = {};
      for (let path of inputPaths) {
        inputPathsWithoutTemplateExtensionsMap[path] = normalizeInputPath(path);
      }

      for (let comparisonInputPath of inputPaths) {
        for (let inputPath of inputPaths) {
          // Compare *without* template extensions: `/en/about.liquid` should match `/es/about.11ty.js`
          let matched = Comparator.matchLanguageFolder(
            inputPathsWithoutTemplateExtensionsMap[comparisonInputPath],
            inputPathsWithoutTemplateExtensionsMap[inputPath]
          );
          if (matched) {
            if (!localeMap[comparisonInputPath]) {
              localeMap[comparisonInputPath] = [];
            }

            let [, langCode] = matched;
            for (let url of inputPathToUrl[inputPath]) {
              localeMap[comparisonInputPath].push({
                url,
                lang: langCode,
                label: iso639.getNativeName(langCode.split("-")[0]),
              });
            }
          }
        }
      }

      // Default sorted by lang code
      for (let key in localeMap) {
        localeMap[key].sort(function (a, b) {
          if (a.lang < b.lang) {
            return -1;
          }
          if (a.lang > b.lang) {
            return 1;
          }
          return 0;
        });
      }

      contentMaps.localeLinksMap = localeMap;
    }
  );

  // Normalize a theoretical URL based on the current page’s language
  // If a non-localized file exists, returns the URL without a language assigned
  // Fails if no file exists (localized and not localized)
  eleventyConfig.addFilter(
    options.filters.url,
    function (url, langCodeOverride) {
      let langCode = langCodeOverride;
      if (!langCode) {
        let pageUrl =
          this.page?.url ||
          this.ctx?.page?.url ||
          this.context?.environments?.page?.url;

        let s = pageUrl.split("/");
        langCode =
          (s.length > 0 && Comparator.isLangCode(s[1]) ? s[1] : "") ||
          options.defaultLanguage;
      }

      let comparisonUrl = `/${langCode}${url}`;
      if (contentMaps.urls[comparisonUrl]) {
        return comparisonUrl;
      }
      // Support missing trailing slash in url
      if (
        !comparisonUrl.endsWith("/") &&
        contentMaps.urls[`${comparisonUrl}/`]
      ) {
        return comparisonUrl;
      }

      if (
        contentMaps.urls[url] ||
        (!url.endsWith("/") && contentMaps.urls[`${url}/`])
      ) {
        // this is not a localized file (independent of a language code)
        if (options.errorMode === "strict") {
          throw new Error(
            `Localized file for URL ${comparisonUrl} was not found in your project. A non-localized version does exist—are you sure you meant to use the \`${options.filters.url}\` filter for this? You can bypass this error using the \`errorMode\` option in the I18N plugin (currently: ${options.errorMode}).`
          );
        }
      } else if (options.errorMode === "allow-fallback") {
        // You’re linking to a localized file that doesn’t exist!
        throw new Error(
          `Localized file for URL ${comparisonUrl} was not found in your project! You will need to add it if you want to link to it using the \`${options.filters.url}\` filter. You can bypass this error using the \`errorMode\` option in the I18N plugin (currently: ${options.errorMode}).`
        );
      }

      return url;
    }
  );

  // Find the links that are localized alternates to the inputPath argument
  eleventyConfig.addFilter(options.filters.links, function (inputPathOverride) {
    let inputPath =
      inputPathOverride ||
      this.page?.inputPath ||
      this.ctx?.page?.inputPath ||
      this.context?.environments?.page?.inputPath;

    return contentMaps.localeLinksMap[inputPath] || [];
  });
}

module.exports = EleventyPlugin;
module.exports.Comparator = Comparator;
