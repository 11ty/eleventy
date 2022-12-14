const posthtml = require("posthtml");
const urls = require("posthtml-urls");
const urlFilter = require("../Filters/Url.js");
const PathPrefixer = require("../Util/PathPrefixer.js");
const { DeepCopy } = require("../Util/Merge");

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

function addPathPrefixToUrl(url, pathPrefix, base) {
  let u;
  if (base) {
    u = new URL(url, base);
  } else {
    u = new URL(url);
  }

  // Add pathPrefix **after** url is transformed using base
  if (pathPrefix) {
    u.pathname = PathPrefixer.joinUrlParts(pathPrefix, u.pathname);
  }
  return u.toString();
}

// pathprefix is only used when overrideBase is a full URL
function transformUrl(url, base, opts = {}) {
  let { pathPrefix, pageUrl } = opts;

  // full URL, return as-is
  if (isValidUrl(url)) {
    return url;
  }

  // Not a full URL, but with a full base URL
  // e.g. relative urls like "subdir/", "../subdir", "./subdir"
  if (isValidUrl(base)) {
    // convert relative paths to absolute path first using pageUrl
    if (pageUrl && !url.startsWith("/")) {
      url = new URL(url, `http://example.com${pageUrl}`).pathname;
    }

    return addPathPrefixToUrl(url, pathPrefix, base);
  }

  // Not a full URL, nor a full base URL (call the built-in `url` filter)
  return urlFilter.call(this, url, base);
}

async function addToAllHtmlUrls(htmlContent, callback, processOptions = {}) {
  let modifier = posthtml().use(
    urls({
      eachURL: function (url) {
        return callback(url);
      },
    })
  );

  let result = await modifier.process(htmlContent, processOptions);
  return result.html;
}

module.exports = function (eleventyConfig, defaultOptions = {}) {
  let opts = DeepCopy(
    {
      // eleventyConfig.pathPrefix is new in Eleventy 2.0.0-canary.15
      // `base` can be a directory (for path prefix transformations)
      //    OR a full URL with origin and pathname
      baseHref: eleventyConfig.pathPrefix,

      extensions: "html",

      name: "htmlBaseWithPathPrefix",
      filters: {
        base: "htmlBaseUrl",
        html: "transformWithHtmlBase",
        pathPrefix: "addPathPrefixToFullUrl",
      },
    },
    defaultOptions
  );

  if (opts.baseHref === undefined) {
    throw new Error(
      "The `base` option is required in the Eleventy HTML Base plugin."
    );
  }

  eleventyConfig.addFilter(opts.filters.pathPrefix, function (url) {
    return addPathPrefixToUrl(url, eleventyConfig.pathPrefix);
  });

  eleventyConfig.addFilter(
    opts.filters.base,
    function (url, baseOverride, pageUrlOverride) {
      let base = baseOverride || opts.baseHref;

      // Do nothing with a default base
      if (base === "/") {
        return url;
      }

      return transformUrl.call(this, url, base, {
        pathPrefix: eleventyConfig.pathPrefix,
        pageUrl: pageUrlOverride || this.page?.url,
      });
    }
  );

  eleventyConfig.addAsyncFilter(
    opts.filters.html,
    function (content, baseOverride, pageUrlOverride) {
      let base = baseOverride || opts.baseHref;

      // Do nothing with a default base
      if (base === "/") {
        return content;
      }

      return addToAllHtmlUrls(content, (url) => {
        return transformUrl.call(this, url.trim(), base, {
          pathPrefix: eleventyConfig.pathPrefix,
          pageUrl: pageUrlOverride || this.page?.url,
        });
      });
    }
  );

  // Skip the transform with a default base
  if (opts.baseHref !== "/") {
    let extensionMap = {};
    for (let ext of (opts.extensions || "").split(",")) {
      extensionMap[ext] = true;
    }

    // Skip the transform if no extensions are specified
    if (Object.keys(extensionMap).length > 0) {
      eleventyConfig.addTransform(opts.name, function (content) {
        let ext = (this.outputPath || "").split(".").pop();
        if (extensionMap[ext]) {
          return addToAllHtmlUrls(content, (url) => {
            return transformUrl.call(this, url.trim(), opts.baseHref, {
              pathPrefix: eleventyConfig.pathPrefix,
              pageUrl: this.url,
            });
          });
        }

        return content;
      });
    }
  }
};

module.exports.applyBaseToUrl = transformUrl;
