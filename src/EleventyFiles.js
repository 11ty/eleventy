const fs = require("fs-extra");

const EleventyExtensionMap = require("./EleventyExtensionMap");
const TemplateGlob = require("./TemplateGlob");
const TemplatePath = require("./TemplatePath");
const TemplatePassthroughManager = require("./TemplatePassthroughManager");

const config = require("./Config");
const debug = require("debug")("Eleventy:EleventyFiles");
// const debugDev = require("debug")("Dev:Eleventy:EleventyFiles");

class EleventyFiles {
  constructor(input, outputDir, formats) {
    this.config = config.getConfig();
    this.input = input;
    this.inputDir = TemplatePath.getDir(this.input);
    this.outputDir = outputDir;

    this.includesDir = this.inputDir + "/" + this.config.dir.includes;
    // Duplicated with TemplateData.getDataDir();
    this.dataDir = this.inputDir + "/" + this.config.dir.data;

    this.setFormats(formats);
    this.setPassthroughManager();
    this.setupGlobs();
  }

  restart() {
    this.passthroughManager.reset();
    this.setupGlobs();
  }

  /* For testing */
  overrideConfig(config) {
    this.config = config;
  }

  setFormats(formats) {
    this.formats = formats;
    this.extensionMap = new EleventyExtensionMap(formats);

    // Input was a directory
    if (this.input === this.inputDir) {
      this.templateGlobs = TemplateGlob.map(
        this.extensionMap.getGlobs(this.inputDir)
      );
    } else {
      this.templateGlobs = TemplateGlob.map([this.input]);
    }
  }

  getPassthroughManager() {
    return this.passthroughManager;
  }

  setPassthroughManager(mgr) {
    if (!mgr) {
      mgr = new TemplatePassthroughManager();
      mgr.setInputDir(this.inputDir);
      mgr.setOutputDir(this.outputDir);
    }

    this.passthroughManager = mgr;
  }

  setupGlobs() {
    this.ignores = this.getIgnores();

    if (this.passthroughAll) {
      this.watchedGlobs = TemplateGlob.map([
        TemplateGlob.normalizePath(this.input, "/**")
      ]).concat(this.ignores);
    } else {
      this.watchedGlobs = this.templateGlobs.concat(this.ignores);
    }

    this.templateGlobsWithIgnores = this.watchedGlobs.concat(
      this.getTemplateIgnores()
    );
  }

  static getFileIgnores(ignoreFile, defaultIfFileDoesNotExist) {
    let dir = TemplatePath.getDirFromFilePath(ignoreFile);
    let ignorePath = TemplatePath.normalize(ignoreFile);
    let ignoreContent;
    try {
      ignoreContent = fs.readFileSync(ignorePath, "utf-8");
    } catch (e) {
      ignoreContent = defaultIfFileDoesNotExist || "";
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
          let path = TemplateGlob.normalizePath(dir, "/", line);
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
  }

  getIgnores() {
    let files = [];

    if (this.config.useGitIgnore) {
      files = files.concat(
        EleventyFiles.getFileIgnores(
          this.inputDir + "/.gitignore",
          "node_modules/"
        )
      );
    }

    files = files.concat(
      EleventyFiles.getFileIgnores(this.inputDir + "/.eleventyignore")
    );

    files = files.concat(TemplateGlob.map("!" + this.outputDir + "/**"));

    return files;
  }

  getIncludesDir() {
    return this.includesDir;
  }

  getDataDir() {
    return this.dataDir;
  }

  getFiles() {
    return this.templateGlobsWithIgnores;
  }

  getRawFiles() {
    return this.templateGlobs;
  }

  getGlobWatcherFiles() {
    // TODO is it better to tie the includes and data to specific file extensions or keep the **?
    return this.templateGlobs
      .concat(this.getIncludesAndDataDirs())
      .concat(this.getPassthroughPaths());
  }

  getGlobWatcherIgnores() {
    // convert to format without ! since they are passed in as a separate argument to glob watcher
    return this.ignores.map(ignore =>
      TemplatePath.stripLeadingDotSlash(ignore.substr(1))
    );
  }

  getPassthroughPaths() {
    let paths = [];
    paths = paths.concat(this.passthroughManager.getConfigPathGlobs());
    // These are already added in the root templateGlobs
    // paths = paths.concat(this.extensionMap.getPrunedGlobs(this.inputDir));
    return paths;
  }

  getIncludesAndDataDirs() {
    let files = [];
    if (this.config.dir.includes) {
      files = files.concat(TemplateGlob.map(this.includesDir + "/**"));
    }

    if (this.config.dir.data && this.config.dir.data !== ".") {
      files = files.concat(TemplateGlob.map(this.dataDir + "/**"));
    }

    return files;
  }

  getTemplateIgnores() {
    return this.getIncludesAndDataDirs().map(function(dir) {
      return "!" + dir;
    });
  }
}

module.exports = EleventyFiles;
