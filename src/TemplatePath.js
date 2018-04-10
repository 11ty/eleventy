const path = require("path");
const normalize = require("normalize-path");

function TemplatePath() {}

TemplatePath.getModuleDir = function() {
  return path.resolve(__dirname, "..");
};

TemplatePath.getWorkingDir = function() {
  return path.resolve("./");
};

// can assume a parse-filepath .dir is passed in here
TemplatePath.getLastDir = function(path) {
  let slashIndex = path.lastIndexOf("/");

  if (slashIndex === -1) {
    return path;
  } else if (slashIndex === path.length - 1) {
    // last character is a slash
    path = path.substring(0, path.length - 1);
  }

  return path.substr(path.lastIndexOf("/") + 1);
};

TemplatePath.getAllDirs = function(path) {
  if (path.indexOf("/") === -1) {
    return [path];
  }

  let split = path.split("/");
  let results = [];
  while (split.length) {
    let folder = split.pop();
    let parent = split.join("/");
    if (folder && folder !== ".") {
      results.push((parent ? parent + "/" : "") + folder);
    }
  }
  return results;
};

/* Outputs ./SAFE/LOCAL/PATHS/WITHOUT/TRAILING/SLASHES */
TemplatePath.normalize = function(...paths) {
  return normalize(path.join(...paths));
};

TemplatePath.hasTrailingSlash = function(thePath, isPreNormalized) {
  if (!thePath) {
    return false;
  }

  let slash = "/";
  // handle windows slashes too
  if (isPreNormalized && process.platform === "win32") {
    slash = "\\";
  }
  return thePath.length && thePath.charAt(thePath.length - 1) === slash;
};

TemplatePath.normalizeUrlPath = function(...paths) {
  let thePath = path.join(...paths);
  let hasTrailingSlashBefore = TemplatePath.hasTrailingSlash(thePath, true);
  let normalizedPath = normalize(thePath);
  let hasTrailingSlashAfter = TemplatePath.hasTrailingSlash(normalizedPath);
  return (
    normalizedPath +
    (hasTrailingSlashBefore && !hasTrailingSlashAfter ? "/" : "")
  );
};

TemplatePath.localPath = function(...paths) {
  return normalize(path.join(TemplatePath.getWorkingDir(), ...paths));
};

TemplatePath.addLeadingDotSlash = function(path) {
  if (path === "." || path === "..") {
    return path + "/";
  } else if (
    path.indexOf("/") === 0 ||
    path.indexOf("./") === 0 ||
    path.indexOf("../") === 0
  ) {
    return path;
  }
  return "./" + path;
};

TemplatePath.stripLeadingDotSlash = function(dir) {
  return dir.replace(/^\.\//, "");
};

TemplatePath.stripPathFromDir = function(targetDir, prunedPath) {
  targetDir = TemplatePath.stripLeadingDotSlash(normalize(targetDir));
  prunedPath = TemplatePath.stripLeadingDotSlash(normalize(prunedPath));

  if (targetDir.indexOf(prunedPath) === 0) {
    return targetDir.substr(prunedPath.length + 1);
  }

  return targetDir;
};

module.exports = TemplatePath;
