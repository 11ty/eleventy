const globby = require("globby");
const normalize = require("normalize-path");
const fs = require("fs-extra");
const lodashCloneDeep = require("lodash.clonedeep");
const Template = require("./Template");
const TemplatePath = require("./TemplatePath");
const TemplateRender = require("./TemplateRender");
const EleventyError = require("./EleventyError");
const Pagination = require("./Plugins/Pagination");
const Collection = require("./TemplateCollection");
const pkg = require("../package.json");
const eleventyConfig = require("./EleventyConfig");
const config = require("./Config");

function TemplateWriter(baseDir, outputDir, extensions, templateData) {
  this.baseDir = baseDir;
  this.templateExtensions = extensions;
  this.outputDir = outputDir;
  this.templateData = templateData;
  this.isVerbose = true;
  this.writeCount = 0;
  this.collection = null;

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
    ignores = ignoreContent
      .split("\n")
      .filter(line => {
        return line.trim().length > 0;
      })
      .map(line => {
        line = line.trim();
        let path = TemplatePath.addLeadingDotSlash(
          TemplatePath.normalize(baseDir, "/", line)
        );
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
  if (config.dir.output) {
    files = files.concat(
      "!" + normalize(baseDir + "/" + config.dir.output + "/**")
    );
  }

  return files;
};

TemplateWriter.prototype.addWritingIgnores = function(baseDir, files) {
  if (config.dir.includes) {
    files = files.concat(
      "!" + normalize(baseDir + "/" + config.dir.includes + "/**")
    );
  }
  if (config.dir.data && config.dir.data !== ".") {
    files = files.concat(
      "!" + normalize(baseDir + "/" + config.dir.data + "/**")
    );
  }

  return files;
};

TemplateWriter.prototype._getAllPaths = async function() {
  return globby(this.files, { gitignore: true });
};

TemplateWriter.prototype._populateCollection = function(templateMaps) {
  this.collection = new Collection();

  for (let map of templateMaps) {
    this.collection.add(map);
  }
};

TemplateWriter.prototype._getTemplatesMap = async function(paths) {
  let templates = [];
  for (let path of paths) {
    let tmpl = this._getTemplate(path);
    let map = await tmpl.getMapped();
    templates.push(map);
  }
  return templates;
};

TemplateWriter.prototype._getTemplate = function(path) {
  let tmpl = new Template(
    path,
    this.baseDir,
    this.outputDir,
    this.templateData
  );

  tmpl.setIsVerbose(this.isVerbose);

  /*
   * Sample filter: arg str, return pretty HTML string
   * function(str) {
   *   return pretty(str, { ocd: true });
   * }
   */
  for (let filterName in config.filters) {
    let filter = config.filters[filterName];
    if (typeof filter === "function") {
      tmpl.addFilter(filter);
    }
  }

  let writer = this;
  tmpl.addPlugin("pagination", async function(data) {
    let paging = new Pagination(data);
    paging.setTemplate(this);
    await paging.write();
    writer.writeCount += paging.getWriteCount();

    if (paging.cancel()) {
      return false;
    }
  });

  return tmpl;
};

TemplateWriter.prototype._getAllTagsFromMap = function(templatesMap) {
  let allTags = {};
  for (let map of templatesMap) {
    let tags = map.data.tags;
    if (Array.isArray(tags)) {
      for (let tag of tags) {
        allTags[tag] = true;
      }
    } else if (tags) {
      allTags[tags] = true;
    }
  }
  return Object.keys(allTags);
};

TemplateWriter.prototype._createTemplateMapCopy = function(templatesMap) {
  let copy = [];
  for (let map of templatesMap) {
    let mapCopy = lodashCloneDeep(map);

    // For simplification, maybe re-add this later?
    delete mapCopy.template;
    // Circular reference
    delete mapCopy.data.collections;

    copy.push(mapCopy);
  }

  return copy;
};

TemplateWriter.prototype._getCollectionsData = function(activeTemplate) {
  let collections = {};
  collections.all = this._createTemplateMapCopy(
    this.collection.getAllSorted(activeTemplate)
  );

  let tags = this._getAllTagsFromMap(collections.all);
  for (let tag of tags) {
    collections[tag] = this._createTemplateMapCopy(
      this.collection.getFilteredByTag(tag, activeTemplate)
    );
  }

  let configCollections = eleventyConfig.getCollections();
  for (let name in configCollections) {
    collections[name] = this._createTemplateMapCopy(
      configCollections[name](this.collection)
    );
  }

  // console.log( "collections>>>>", collections );
  // console.log( ">>>>> end collections" );

  return collections;
};

TemplateWriter.prototype._writeTemplate = async function(
  tmpl,
  outputPath,
  data
) {
  try {
    data.collections = this._getCollectionsData(tmpl);

    await tmpl.writeWithData(outputPath, data);
  } catch (e) {
    throw EleventyError.make(
      new Error(`Having trouble writing template: ${outputPath}`),
      e
    );
  }

  this.writeCount += tmpl.getWriteCount();
  return tmpl;
};

TemplateWriter.prototype.write = async function() {
  let paths = await this._getAllPaths();
  let templatesMap = await this._getTemplatesMap(paths);
  this._populateCollection(templatesMap);

  for (let template of templatesMap) {
    await this._writeTemplate(
      template.template,
      template.outputPath,
      template.data
    );
  }

  eleventyConfig.emit("alldata", this.collection.getAllSorted());
};

TemplateWriter.prototype.setVerboseOutput = function(isVerbose) {
  this.isVerbose = isVerbose;
};

TemplateWriter.prototype.getWriteCount = function() {
  return this.writeCount;
};

module.exports = TemplateWriter;
