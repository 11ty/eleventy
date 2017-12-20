const parsePath = require("parse-filepath");
const normalize = require("normalize-path");
const TemplatePath = require("./TemplatePath");

function TemplatePermalink(link, extraSubdir) {
  this.link = this._cleanLink(link);
  this.extraSubdir = extraSubdir || "";
}

TemplatePermalink.prototype._cleanLink = function(link) {
  return link + (link.substr(-1) === "/" ? "index.html" : "");
};

TemplatePermalink.prototype.resolve = function() {
  let parsed = parsePath(this.link);

  return TemplatePath.normalize(
    parsed.dir + "/" + this.extraSubdir + parsed.base // name with extension
  );
};

TemplatePermalink.prototype.toString = function() {
  return this.resolve();
};

TemplatePermalink._hasDuplicateFolder = function(dir, base) {
  let folders = dir.split("/");
  if (!folders[folders.length - 1]) {
    folders.pop();
  }
  return folders[folders.length - 1] === base;
};

TemplatePermalink.generate = function(dir, filenameNoExt, extraSubdir, suffix) {
  let hasDupeFolder = TemplatePermalink._hasDuplicateFolder(dir, filenameNoExt);
  let path =
    (dir ? dir + "/" : "") +
    (filenameNoExt !== "index" && !hasDupeFolder ? filenameNoExt + "/" : "") +
    "index" +
    (suffix || "") +
    ".html";

  return new TemplatePermalink(path, extraSubdir);
};

module.exports = TemplatePermalink;
