const globby = require("globby");
const normalize = require("normalize-path");
const pretty = require("pretty");
const fs = require("fs-extra");
const Template = require("./Template");
const TemplatePath = require("./TemplatePath");
const TemplateRender = require("./TemplateRender");
const TemplateConfig = require("./TemplateConfig");
const Pagination = require("./Plugins/Pagination");

const pkg = require("../package.json");

let templateCfg = new TemplateConfig(require("../config.json"));
let cfg = templateCfg.getConfig();

function TemplateWriter(baseDir, outputDir, extensions, templateData) {
  this.baseDir = baseDir;
  this.templateExtensions = extensions;
  this.outputDir = outputDir;
  this.templateData = templateData;

  this.rawFiles = this.templateExtensions.map(
    function(extension) {
      return normalize(this.baseDir + "/**/*." + extension);
    }.bind(this)
  );

  this.watchedFiles = this.addIgnores(baseDir, this.rawFiles);
  this.files = this.addWritingIgnores(baseDir, this.watchedFiles);
}

TemplateWriter.prototype.getRawFiles = function() {
  return this.rawFiles;
};

TemplateWriter.prototype.getWatchedIgnores = function() {
  return this.addIgnores(this.baseDir, []).map(ignore =>
    TemplatePath.stripLeadingDotSlash(ignore.substr(1))
  );
};

TemplateWriter.prototype.getFiles = function() {
  return this.files;
};

TemplateWriter.getFileIgnores = function(baseDir) {
  let ignorePath = TemplatePath.normalize(baseDir + "/.eleventyignore");
  let ignoreContent;
  try {
    ignoreContent = fs.readFileSync(ignorePath, "utf-8");
  } catch (e) {
    ignoreContent = "";
  }
  let ignores = [];

  if (ignoreContent) {
    ignores = ignoreContent.split("\n").map(line => {
      line = line.trim();
      path = TemplatePath.normalize(baseDir, "/", line);
      if (fs.statSync(path).isDirectory()) {
        return "!" + path + "/**";
      }
      return "!" + path;
    });
  }

  return ignores;
};

TemplateWriter.prototype.addIgnores = function(baseDir, files) {
  files = files.concat(TemplateWriter.getFileIgnores(baseDir));

  if (cfg.dir.output) {
    files = files.concat(
      "!" + normalize(baseDir + "/" + cfg.dir.output + "/**")
    );
  }

  return files;
};

TemplateWriter.prototype.addWritingIgnores = function(baseDir, files) {
  if (cfg.dir.includes) {
    files = files.concat(
      "!" + normalize(baseDir + "/" + cfg.dir.includes + "/**")
    );
  }
  if (cfg.dir.data) {
    files = files.concat("!" + normalize(baseDir + "/" + cfg.dir.data + "/**"));
  }

  return files;
};

TemplateWriter.prototype._getTemplate = function(path) {
  let tmpl = new Template(
    path,
    this.baseDir,
    this.outputDir,
    this.templateData
  );

  tmpl.addFilter(function(str) {
    return pretty(str, { ocd: true });
  });

  tmpl.addPlugin("pagination", async function(data) {
    var paging = new Pagination(data);
    paging.setTemplate(this);
    await paging.write();
    if (paging.cancel()) {
      return false;
    }
  });

  return tmpl;
};

TemplateWriter.prototype._writeTemplate = async function(path) {
  let tmpl = this._getTemplate(path);
  await tmpl.write();
  return tmpl;
};

TemplateWriter.prototype.write = async function() {
  var paths = await globby(this.files, { gitignore: true });
  for (var j = 0, k = paths.length; j < k; j++) {
    await this._writeTemplate(paths[j]);
  }
};

module.exports = TemplateWriter;
