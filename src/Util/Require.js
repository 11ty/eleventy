const fs = require("fs");
const { TemplatePath } = require("@11ty/eleventy-utils");

function requireLocal(localPath) {
  let absolutePath = TemplatePath.absolutePath(localPath);

  return require(absolutePath);
}

// Used for JSON imports, suffering from Node warning that import assertions experimental but also
// throwing an error if you try to import() a JSON file without an import assertion.
async function loadContents(path, options = {}) {
  let rawInput;
  let encoding = "utf8";
  if ("encoding" in options) {
    encoding = options.encoding;
  }

  try {
    rawInput = await fs.promises.readFile(path, encoding);
  } catch (e) {
    // if file does not exist, return nothing
  }

  // Can return a buffer, string, etc
  if (typeof rawInput === "string") {
    rawInput = rawInput.trim();
  }

  return rawInput;
}

async function dynamicImport(localPath, type, bypassCache = false) {
  let absolutePath = TemplatePath.absolutePath(localPath);

  if (localPath.endsWith(".json") || type === "json") {
    // https://v8.dev/features/import-assertions#dynamic-import() is still experimental in Node 20
    let rawInput = await loadContents(absolutePath);
    return JSON.parse(rawInput);
  }

  let target = await import(absolutePath);
  return target.default;
}

module.exports.EleventyRequire = requireLocal;
module.exports.EleventyLoadContent = loadContents;
module.exports.EleventyImport = dynamicImport;
