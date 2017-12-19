const path = require("path");
const normalize = require("normalize-path");

function TemplatePath() {}

TemplatePath.getModuleDir = function() {
  return path.resolve(__dirname, "..");
};

TemplatePath.getWorkingDir = function() {
  return path.resolve("./");
};

/* Outputs ./SAFE/LOCAL/PATHS/WITHOUT/TRAILING/SLASHES */
TemplatePath.normalize = function(...paths) {
  return normalize(path.join(...paths));
};

TemplatePath.localPath = function(...paths) {
  return normalize(path.join(TemplatePath.getWorkingDir(), ...paths));
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
