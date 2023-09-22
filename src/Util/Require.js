const fs = require("fs");
const { TemplatePath } = require("@11ty/eleventy-utils");
const eventBus = require("../EventBus.js");

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

let lastModifiedPaths = new Map();
eventBus.on("eleventy.resourceModified", (filePath) => {
  lastModifiedPaths.set(TemplatePath.absolutePath(filePath), Date.now());
});

async function dynamicImport(localPath, type) {
  let absolutePath = TemplatePath.absolutePath(localPath);

  if (localPath.endsWith(".json") || type === "json") {
    // https://v8.dev/features/import-assertions#dynamic-import() is still experimental in Node 20
    let rawInput = await loadContents(absolutePath);
    return JSON.parse(rawInput);
  }

  let urlPath;
  try {
    let u = new URL(`file:${absolutePath}`);

    // Bust the import cache if this is the last modified file
    if (lastModifiedPaths.has(absolutePath)) {
      u.searchParams.set("_cache_bust", lastModifiedPaths.get(absolutePath));
    }

    urlPath = u.toString();
  } catch (e) {
    urlPath = absolutePath;
  }

  let target = await import(urlPath);

  // If the only export is `default`, elevate to top
  // console.log( {target} );
  let keys = Object.keys(target);
  if (keys.length === 1 && "default" in target) {
    return target.default;
  }

  // First thought, unimplemented thought (probably too much magic):
  // if `default` export is a plain object, should we merge that to top level?
  // Use `isPlainObject` and `DeepCopy`

  // Otherwise return { default: value, named: value }
  return target;
}

module.exports.EleventyRequire = requireLocal;
module.exports.EleventyLoadContent = loadContents;
module.exports.EleventyImport = dynamicImport;
