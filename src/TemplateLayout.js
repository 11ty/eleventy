const fs = require("fs-extra");
const config = require("./Config");

function TemplateLayout(name, dir) {
  this.dir = dir;
  this.name = name;
  this.filename = this.findFileName();
  this.fullPath = this.dir + "/" + this.filename;
}

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
  config.templateFormats.forEach(
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
