const fs = require("fs-extra");
const config = require("./Config");
const EleventyExtensionMap = require("./EleventyExtensionMap");
const debug = require("debug")("Eleventy:TemplateLayout");

function TemplateLayout(path, dir) {
  this.config = config.getConfig();
  this.dir = dir;
  this.originalPath = path;
  this.path = path;
  this.aliases = {};

  this.init();
}

TemplateLayout.prototype.init = function() {
  // we might be able to move this into the constructor?
  this.aliases = Object.assign({}, this.config.layoutAliases, this.aliases);
  // debug("Current layout aliases: %o", this.aliases);

  if (this.path in this.aliases) {
    // debug(
    //   "Substituting layout: %o maps to %o",
    //   this.path,
    //   this.aliases[this.path]
    // );
    this.path = this.aliases[this.path];
  }

  this.pathAlreadyHasExtension = this.dir + "/" + this.path;

  if (
    this.path.split(".").length > 0 &&
    fs.existsSync(this.pathAlreadyHasExtension)
  ) {
    this.filename = this.path;
    this.fullPath = this.pathAlreadyHasExtension;
  } else {
    this.filename = this.findFileName();
    this.fullPath = this.dir + "/" + this.filename;
  }
};

TemplateLayout.prototype.addLayoutAlias = function(from, to) {
  this.aliases[from] = to;
};

TemplateLayout.prototype.getFileName = function() {
  if (!this.filename) {
    throw new Error(
      `You’re trying to use a layout that does not exist: ${
        this.originalPath
      } (${this.filename})`
    );
  }

  return this.filename;
};

TemplateLayout.prototype.getFullPath = function() {
  if (!this.filename) {
    throw new Error(
      `You’re trying to use a layout that does not exist: ${
        this.originalPath
      } (${this.filename})`
    );
  }

  return this.fullPath;
};

TemplateLayout.prototype.findFileName = function() {
  if (!fs.existsSync(this.dir)) {
    throw Error(
      "TemplateLayout directory does not exist for " +
        this.path +
        ": " +
        this.dir
    );
  }

  let extensionMap = new EleventyExtensionMap(this.config.templateFormats);
  for (let filename of extensionMap.getFileList(this.path)) {
    // TODO async
    if (fs.existsSync(this.dir + "/" + filename)) {
      return filename;
    }
  }
};

module.exports = TemplateLayout;
