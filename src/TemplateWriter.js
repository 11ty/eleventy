const globby = require("globby");
const normalize = require("normalize-path");
const fs = require("fs-extra");
const lodashCloneDeep = require("lodash.clonedeep");
const parsePath = require("parse-filepath");
const Template = require("./Template");
const TemplatePath = require("./TemplatePath");
const TemplateRender = require("./TemplateRender");
const EleventyError = require("./EleventyError");
const Pagination = require("./Plugins/Pagination");
const Collection = require("./TemplateCollection");
const pkg = require("../package.json");
const eleventyConfig = require("./EleventyConfig");
const config = require("./Config");
const debug = require("debug")("Eleventy:TemplateWriter");

function TemplateWriter(inputPath, outputDir, extensions, templateData) {
  this.config = config.getConfig();
  this.input = inputPath;
  this.inputDir = this._getInputPathDir(inputPath);
  this.templateExtensions = extensions;
  this.outputDir = outputDir;
  this.templateData = templateData;
  this.isVerbose = true;
  this.writeCount = 0;
  this.collection = null;

  this.includesDir = this.inputDir + "/" + this.config.dir.includes;
  // Duplicated with TemplateData.getDataDir();
  this.dataDir = this.inputDir + "/" + this.config.dir.data;

  // Input was a directory
  if (this.input === this.inputDir) {
    this.rawFiles = this.templateExtensions.map(
      function(extension) {
        return TemplatePath.cleanupPathForGlobby(
          this.inputDir + "/**/*." + extension
        );
      }.bind(this)
    );
  } else {
    this.rawFiles = [TemplatePath.cleanupPathForGlobby(inputPath)];
  }

  this.watchedFiles = this.addIgnores(this.inputDir, this.rawFiles);
  this.files = this.addWritingIgnores(this.inputDir, this.watchedFiles);
}

TemplateWriter.prototype.getIncludesDir = function() {
  return this.includesDir;
};

TemplateWriter.prototype.getDataDir = function() {
  return this.dataDir;
};

TemplateWriter.prototype._getInputPathDir = function(inputPath) {
  // Input points to a file
  if (!fs.statSync(inputPath).isDirectory()) {
    return parsePath(inputPath).dir;
  }

  // Input is a dir
  if (inputPath) {
    return inputPath;
  }

  return ".";
};

TemplateWriter.prototype.getRawFiles = function() {
  return this.rawFiles;
};

TemplateWriter.prototype.getWatchedIgnores = function() {
  return this.addIgnores(this.inputDir, []).map(ignore =>
    TemplatePath.stripLeadingDotSlash(ignore.substr(1))
  );
};

TemplateWriter.prototype.getFiles = function() {
  return this.files;
};

TemplateWriter.getFileIgnores = function(ignoreFile) {
  let dir = parsePath(ignoreFile).dir || ".";
  let ignorePath = TemplatePath.normalize(ignoreFile);
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
      .map(line => {
        return line.trim();
      })
      .filter(line => {
        // empty lines or comments get filtered out
        return line.length > 0 && line.charAt(0) !== "#";
      })
      .map(line => {
        let path = TemplatePath.addLeadingDotSlash(
          TemplatePath.normalize(dir, "/", line)
        );
        debug(`${ignoreFile} ignoring: ${path}`);
        try {
          let stat = fs.statSync(path);
          if (stat.isDirectory()) {
            return "!" + path + "/**";
          }
          return "!" + path;
        } catch (e) {
          return "!" + path;
        }
      });
  }

  return ignores;
};

TemplateWriter.prototype.addIgnores = function(inputDir, files) {
  files = files.concat(
    TemplateWriter.getFileIgnores(inputDir + "/.eleventyignore")
  );
  files = files.concat(TemplateWriter.getFileIgnores(".gitignore"));

  files = files.concat(
    "!" + TemplatePath.addLeadingDotSlash(normalize(this.outputDir + "/**"))
  );

  return files;
};

TemplateWriter.prototype.addWritingIgnores = function(inputDir, files) {
  if (this.config.dir.includes) {
    files = files.concat(
      "!" + TemplatePath.addLeadingDotSlash(normalize(this.includesDir + "/**"))
    );
  }

  if (this.config.dir.data && this.config.dir.data !== ".") {
    files = files.concat(
      "!" + TemplatePath.addLeadingDotSlash(normalize(this.dataDir + "/**"))
    );
  }

  return files;
};

TemplateWriter.prototype._getAllPaths = async function() {
  // Note the gitignore: true option for globby is _really slow_
  return globby(this.files); //, { gitignore: true });
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
    debug(`Template for ${path} added to map.`);
  }
  return templates;
};

TemplateWriter.prototype._getTemplate = function(path) {
  let tmpl = new Template(
    path,
    this.inputDir,
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
  for (let filterName in this.config.filters) {
    let filter = this.config.filters[filterName];
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
  debug(`Collection: collections.all has ${collections.all.length} items.`);

  let tags = this._getAllTagsFromMap(collections.all);
  for (let tag of tags) {
    collections[tag] = this._createTemplateMapCopy(
      this.collection.getFilteredByTag(tag, activeTemplate)
    );
    debug(
      `Collection: collections.${tag} has ${collections[tag].length} items.`
    );
  }

  let configCollections = eleventyConfig.getCollections();
  for (let name in configCollections) {
    collections[name] = this._createTemplateMapCopy(
      configCollections[name](this.collection)
    );
    debug(
      `Collection: collections.${name} has ${collections[name].length} items.`
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
  debug("Searching for:");
  debug(this.files);
  let paths = await this._getAllPaths();
  debug("Found:" + (!paths.length ? " no eligible tempates." : ""));
  if (paths.length) {
    debug(paths);
  }
  let templatesMap = await this._getTemplatesMap(paths);
  this._populateCollection(templatesMap);

  for (let template of templatesMap) {
    await this._writeTemplate(
      template.template,
      template.outputPath,
      template.data
    );
    debug(`Wrote template ${template.outputPath} from ${template.inputPath}`);
  }

  eleventyConfig.emit("alldata", this.collection.getAllSorted());
  debug("`alldata` event triggered.");
};

TemplateWriter.prototype.setVerboseOutput = function(isVerbose) {
  this.isVerbose = isVerbose;
};

TemplateWriter.prototype.getWriteCount = function() {
  return this.writeCount;
};

module.exports = TemplateWriter;
