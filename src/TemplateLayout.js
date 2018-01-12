const fs = require("fs-extra");
const config = require("./Config");

function TemplateLayout(name, dir) {
  this.config = config.getConfig();
  this.dir = dir;
  this.name = name;
  this.pathNameAlreadyHasExtension = this.dir + "/" + this.name;
  if (
    this.name.split(".").length > 0 &&
    fs.existsSync(this.pathNameAlreadyHasExtension)
  ) {
    this.filename = this.name;
    this.fullPath = this.pathNameAlreadyHasExtension;
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
        this.name +
        ": " +
        this.dir
    );
  }

  this.config.templateFormats.forEach(
    function(extension) {
      let filename = this.name + "." + extension;
      if (!file && fs.existsSync(this.dir + "/" + filename)) {
        file = filename;
      }
    }.bind(this)
  );

  return file;
};

module.exports = TemplateLayout;
