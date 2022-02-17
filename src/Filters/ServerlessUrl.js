const { compile } = require("path-to-regexp");

function stringify(url, urlData = {}) {
  let fn = compile(url, { encode: encodeURIComponent });
  return fn(urlData);
}

module.exports = function (url, urlData = {}) {
  if (Array.isArray(url)) {
    let errors = [];
    let urls = url
      .slice()
      .map((entry) => {
        // if multiple serverless URLs exist, return the first one that matches
        let result = false;
        try {
          result = stringify(entry, urlData);
        } catch (e) {
          errors.push(e.message);
        } finally {
          return result;
        }
      })
      .filter((entry) => !!entry);

    if (!urls.length) {
      throw new Error(
        "Looked through an array of serverless URLs but found no matches, errors: " +
          errors.join(";")
      );
    }

    return urls;
  }

  return stringify(url, urlData);
};
