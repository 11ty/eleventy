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

class LangUtils {
  static swapLanguageCode(str, langCode) {
    if (!Comparator.isLangCode(langCode)) {
      return str;
    }

    let found = false;
    return str
      .split("/")
      .map((entry) => {
        if (!found && Comparator.isLangCode(entry)) {
          found = true;
          return langCode;
        }
        return entry;
      })
      .join("/");
  }

  static buildDictionary(localeDictionaries = {}) {
    // Ensure we get an object
    if (!isObject(localeDictionaries)) {
      throw new Error(
        `The buildDictionaries method expects an object with one or more properties whose key is the language code and the value is the dictionary for that language's translations.`
      );
    }

    // Initialize the dictionary
    const dictionary = {};

    // Build the dictionary from each language file
    for (const [locale, i18n] of Object.entries(localeDictionaries)) {
      /*
       * Each language's locale file should have a "lang" property and an "i18n" property (nesting is allowed for the latter):
       * {
       *   "lang": "en",
       *   "i18n": {
       *     "home": "Home",
       *     "feed": {
       *       "label": "Feed",
       *       "cta": "Subscribe to the RSS feed"
       *     }
       *   }
       * }
       */

      // Add the dictionary entries from that locale to the dictionary
      createLangDictionary(locale, i18n, dictionary);
    }

    /*
     * After assigning the values of each locale's dictionary (e.g. "en" and "fr"), the output will have shifted the object so the locale is the last key of the chain:
     * {
     *   "home": {
     *     "en": "Home",
     *     "fr": "Acceuil",
     *   },
     *   "feed": {
     *     "label": {
     *       "en": "Feed",
     *       "fr": "Flux"
     *     },
     *     "cta": {
     *       "en": "Subscribe to the RSS feed",
     *       "fr": "S'inscrire au flux RSS",
     *     }
     *   }
     * }
     */

    // Return the full set
    return dictionary;
  }
}

class Comparator {
  // https://en.wikipedia.org/wiki/IETF_language_tag#Relation_to_other_standards
  // Requires a ISO-639-1 language code at the start (2 characters before the first -)
  static isLangCode(code) {
    let [s] = (code || "").split("-");
    return iso639.validate(s) && !!bcp47Normalize(code);
  }

  static urlHasLangCode(url, code) {
    if (!Comparator.isLangCode(code)) {
      return false;
    }

    return url.split("/").some((entry) => entry === code);
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

function getPageInFilter(context) {
  return (
    context.page || context.ctx?.page || context.context?.environments?.page
  );
}

function normalizeInputPath(inputPath, extensionMap) {
  if (extensionMap) {
    return extensionMap.removeTemplateExtension(inputPath);
  }
  return inputPath;
}

function isObject(obj) {
  return (
    Object.prototype.toString.call(obj).slice(8, -1).toLowerCase() === "object"
  );
}

function createLangDictionary(lang, object, dictionary = {}) {
  if (!object) {
    return dictionary;
  }
  for (const [key, value] of Object.entries(object)) {
    // Create an empty object for the property if it does not exist
    if (typeof dictionary[key] === "undefined") {
      dictionary[key] = {};
    }

    if (isObject(value)) {
      // If it's an object, recursively assign
      dictionary[key] = DeepCopy(
        dictionary[key],
        createLangDictionary(lang, value, dictionary[key])
      );
    } else {
      // End of the line: set the translation value for the provided lang
      dictionary[key][lang] = value;
    }
  }
  return dictionary;
}

function getDeep(obj, keys) {
  if (!obj || !isObject(obj)) {
    throw `The provided argument is not an object.`;
  }
  if (typeof keys === "string") {
    keys = keys.split(".").map((key) => key.trim());
  }
  if (keys.length === 0) {
    return false;
  }

  while (keys.length > 0) {
    const key = keys.shift();
    if (!obj.hasOwnProperty(key)) {
      return false;
    }
    obj = obj[key];
    if (!obj) {
      return false;
    }
  }
  return obj;
}

/*
 * Input: {
 *   '/en-us/': './test/stubs-i18n/en-us/index.11ty.js',
 *   '/en/': './test/stubs-i18n/en/index.liquid',
 *   '/es/': './test/stubs-i18n/es/index.njk',
 *   '/non-lang-file/': './test/stubs-i18n/non-lang-file.njk'
 * }
 *
 * Output: {
 *   '/en-us/': [ '/en/', '/es/' ],
 *   '/en/': [ '/en-us/', '/es/' ],
 *   '/es/': [ '/en-us/', '/en/' ]
 * }
 */
function getLocaleUrlsMap(urlToInputPath, extensionMap) {
  // map of input paths => array of localized urls
  let urlMap = {};

  // map of input paths without extensions
  let inputPathsWithoutTemplateExtensionsMap = {};
  for (let path of Object.values(urlToInputPath)) {
    inputPathsWithoutTemplateExtensionsMap[path] = normalizeInputPath(
      path,
      extensionMap
    );
  }

  for (let comparisonUrl in urlToInputPath) {
    for (let url in urlToInputPath) {
      let comparisonInputPath = urlToInputPath[comparisonUrl];
      let inputPath = urlToInputPath[url];

      // Compare *without* template extensions: `/en/about.liquid` should match `/es/about.11ty.js`
      let matched = Comparator.matchLanguageFolder(
        inputPathsWithoutTemplateExtensionsMap[comparisonInputPath],
        inputPathsWithoutTemplateExtensionsMap[inputPath]
      );
      if (matched) {
        if (!urlMap[comparisonUrl]) {
          urlMap[comparisonUrl] = [];
        }

        let [, langCode] = matched;
        urlMap[comparisonUrl].push({
          url,
          lang: langCode,
          label: iso639.getNativeName(langCode.split("-")[0]),
        });
      }
    }
  }

  // Default sorted by lang code
  for (let key in urlMap) {
    urlMap[key].sort(function (a, b) {
      if (a.lang < b.lang) {
        return -1;
      }
      if (a.lang > b.lang) {
        return 1;
      }
      return 0;
    });
  }

  return urlMap;
}

function EleventyPlugin(eleventyConfig, opts = {}) {
  let options = DeepCopy(
    {
      defaultLanguage: "",
      dictionary: {},
      dictKey: "i18n",
      filters: {
        url: "locale_url",
        links: "locale_links",
        dict: "locale_dict",
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

  let contentMaps = {};
  eleventyConfig.on(
    "eleventy.contentMap",
    function ({ urlToInputPath, inputPathToUrl }) {
      contentMaps.inputPathToUrl = inputPathToUrl;
      contentMaps.urlToInputPath = urlToInputPath;

      contentMaps.localeUrlsMap = getLocaleUrlsMap(
        urlToInputPath,
        extensionMap
      );
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
        let pageUrl = getPageInFilter(this)?.url;
        let s = pageUrl.split("/");
        langCode =
          (s.length > 0 && Comparator.isLangCode(s[1]) ? s[1] : "") ||
          options.defaultLanguage;
      }

      // Already has a language code on it and has a relevant url with the target language code
      if (
        contentMaps.localeUrlsMap[url] ||
        (!url.endsWith("/") && contentMaps.localeUrlsMap[`${url}/`])
      ) {
        for (let existingUrlObj of contentMaps.localeUrlsMap[url] ||
          contentMaps.localeUrlsMap[`${url}/`]) {
          if (Comparator.urlHasLangCode(existingUrlObj.url, langCode)) {
            return existingUrlObj.url;
          }
        }
      }

      // Needs the language code prepended to the URL
      let prependedLangCodeUrl = `/${langCode}${url}`;
      if (
        contentMaps.localeUrlsMap[prependedLangCodeUrl] ||
        (!prependedLangCodeUrl.endsWith("/") &&
          contentMaps.localeUrlsMap[`${prependedLangCodeUrl}/`])
      ) {
        return prependedLangCodeUrl;
      }

      if (
        contentMaps.urlToInputPath[url] ||
        (!url.endsWith("/") && contentMaps.urlToInputPath[`${url}/`])
      ) {
        // this is not a localized file (independent of a language code)
        if (options.errorMode === "strict") {
          throw new Error(
            `Localized file for URL ${prependedLangCodeUrl} was not found in your project. A non-localized version does exist—are you sure you meant to use the \`${options.filters.url}\` filter for this? You can bypass this error using the \`errorMode\` option in the I18N plugin (current value: "${options.errorMode}").`
          );
        }
      } else if (options.errorMode === "allow-fallback") {
        // You’re linking to a localized file that doesn’t exist!
        throw new Error(
          `Localized file for URL ${prependedLangCodeUrl} was not found in your project! You will need to add it if you want to link to it using the \`${options.filters.url}\` filter. You can bypass this error using the \`errorMode\` option in the I18N plugin (current value: "${options.errorMode}").`
        );
      }

      return url;
    }
  );

  // Refactor to use url
  // Find the links that are localized alternates to the inputPath argument
  eleventyConfig.addFilter(options.filters.links, function (urlOverride) {
    let url = urlOverride || getPageInFilter(this)?.url;
    return contentMaps.localeUrlsMap[url] || [];
  });

  // Returns a `page`-esque variable for the root default language page
  // If paginated, returns first result only
  eleventyConfig.addFilter(
    "locale_page", // This is not exposed in `options` because it is an Eleventy internals filter (used in get*CollectionItem filters)
    function (pageOverride, languageCode) {
      if (!languageCode) {
        languageCode = options.defaultLanguage;
      }

      let page = pageOverride || getPageInFilter(this);
      let url; // new url
      if (contentMaps.localeUrlsMap[page.url]) {
        for (let entry of contentMaps.localeUrlsMap[page.url]) {
          if (entry.lang === languageCode) {
            url = entry.url;
          }
        }
      }

      let inputPath = LangUtils.swapLanguageCode(page.inputPath, languageCode);

      if (
        !url ||
        !Array.isArray(contentMaps.inputPathToUrl[inputPath]) ||
        contentMaps.inputPathToUrl[inputPath].length === 0
      ) {
        // no internationalized pages found
        return page;
      }

      let result = {
        // // note that the permalink/slug may be different for the localized file!
        url,
        inputPath,
        filePathStem: LangUtils.swapLanguageCode(
          page.filePathStem,
          languageCode
        ),
        // outputPath is omitted here, not necessary for GetCollectionItem.js if url is provided
        __locale_page_resolved: true,
      };
      return result;
    }
  );

  // Translate strings of text based on a dictionary, with a fallback to the default language
  eleventyConfig.addFilter(options.filters.dict, function (key) {
    // Find the page context
    const context = this?.ctx || this.context?.environments;

    // Determine the target language, or use the default
    const lang = context.lang || options.defaultLanguage;

    // Extend the dictionary if an object with the dictionary key exists
    const addIns = context.hasOwnProperty(options.dictKey)
      ? context[options.dictKey]
      : false; // Default dictionary values will be overwritten if there are conflicts

    // Use dictionary as is if no additional entries are provided, or build the extended dictionary for the context of the current page
    const extendedDictionary = !addIns
      ? options.dictionary
      : createLangDictionary(lang, addIns, DeepCopy(options.dictionary));

    // Find the nested value of the translation, or the default language one if the value isn't found
    const translation =
      getDeep(extendedDictionary, `${key}.${lang}`) ||
      getDeep(extendedDictionary, `${key}.${options.defaultLanguage}`);

    // If no translation was found, throw an error
    if (!translation) {
      throw new Error(
        `The dictionary entry for [${key}] was not found in the target language or the default language.`
      );
    }

    return translation;
  });
}

module.exports = EleventyPlugin;
module.exports.Comparator = Comparator;
module.exports.LangUtils = LangUtils;
