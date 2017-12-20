const parsePath = require("parse-filepath");
const normalize = require("normalize-path");
const TemplatePath = require("./TemplatePath");

function TemplatePermalink(link, extraSubdir) {
  this.link = this._cleanLink(link);
  this.extraSubdir = extraSubdir || "";
  this.parsed = parsePath(this.link);
}

TemplatePermalink.prototype._cleanLink = function(link) {
  return link + (link.substr(-1) === "/" ? "index.html" : "");
};

TemplatePermalink.prototype.resolve = function() {
  return TemplatePath.normalize(
    this.parsed.dir + "/" + this.extraSubdir + this.parsed.base // name with extension
  );
};

TemplatePermalink.prototype.toString = function() {
  return this.resolve();
};

module.exports = TemplatePermalink;
