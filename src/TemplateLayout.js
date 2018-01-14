const fs = require("fs-extra");
const config = require("./Config");

function TemplateLayout(path, dir) {
  this.config = config.getConfig();
  this.dir = dir;
  this.path = path;
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
}

TemplateLayout.prototype.getFileName = function() {
  return this.filename;
};

TemplateLayout.prototype.getFullPath = function() {
  return this.fullPath;
};

TemplateLayout.prototype.findFileName = function() {
  let file;
  if (!fs.existsSync(this.dir)) {
    throw Error(
      "TemplateLayout directory does not exist for " +
        this.path +
        ": " +
        this.dir
    );
  }

  this.config.templateFormats.forEach(
    function(extension) {
      let filename = this.path + "." + extension;
      if (!file && fs.existsSync(this.dir + "/" + filename)) {
        file = filename;
      }
    }.bind(this)
  );

  return file;
};

module.exports = TemplateLayout;
