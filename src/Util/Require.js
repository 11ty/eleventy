const { TemplatePath } = require("@11ty/eleventy-utils");

function requireLocal(localPath) {
  let absolutePath = TemplatePath.absolutePath(localPath);

  return require(absolutePath);
}

module.exports.EleventyRequire = requireLocal;
