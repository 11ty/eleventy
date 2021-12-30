const fs = require("fs");
const fastglob = require("fast-glob");

const EleventyExtensionMap = require("./EleventyExtensionMap");
const TemplateData = require("./TemplateData");
const TemplateGlob = require("./TemplateGlob");
const TemplatePath = require("./TemplatePath");
const TemplatePassthroughManager = require("./TemplatePassthroughManager");
const EleventyBaseError = require("./EleventyBaseError");

class EleventyFilesError extends EleventyBaseError {}

const debug = require("debug")("Eleventy:EleventyFiles");
// const debugDev = require("debug")("Dev:Eleventy:EleventyFiles");
const aggregateBench = require("./BenchmarkManager").get("Aggregate");

class EleventyFiles {
  constructor(input, outputDir, formats, eleventyConfig) {
    if (!eleventyConfig) {
      throw new EleventyFilesError("Missing `eleventyConfig`` argument.");
    }
    this.eleventyConfig = eleventyConfig;
    this.config = eleventyConfig.getConfig();
    this.input = input;
    this.inputDir = TemplatePath.getDir(this.input);
    this.outputDir = outputDir;

    this.initConfig();

    this.passthroughAll = false;

    this.formats = formats;
    this.eleventyIgnoreContent = false;

    // init has not yet been called()
    this.alreadyInit = false;
  }

  /* Overrides this.input and this.inputDir,
   * Useful when input is a file and inputDir is not its direct parent */
  setInput(inputDir, input) {
    this.inputDir = inputDir;
    this.input = input;

    this.initConfig();

    if (this.alreadyInit) {
      this.init();
    }
  }

  initConfig() {
    this.includesDir = TemplatePath.join(
      this.inputDir,
      this.config.dir.includes
    );

    if ("layouts" in this.config.dir) {
      this.layoutsDir = TemplatePath.join(
        this.inputDir,
        this.config.dir.layouts
      );
    }
  }

  init() {
    this.alreadyInit = true;

    // Input is a directory
    if (this.input === this.inputDir) {
      this.templateGlobs = this.extensionMap.getGlobs(this.inputDir);
    } else {
      // input is not a directory
      this.templateGlobs = TemplateGlob.map([this.input]);
    }

    this.initPassthroughManager();
    this.setupGlobs();
  }

  get validTemplateGlobs() {
    if (!this._validTemplateGlobs) {
      let globs;
      // Input is a directory
      if (this.input === this.inputDir) {
        globs = this.extensionMap.getValidGlobs(this.inputDir);
      } else {
        globs = this.templateGlobs;
      }
      this._validTemplateGlobs = globs;
    }
    return this._validTemplateGlobs;
  }

  get passthroughGlobs() {
    let paths = new Set();
    // stuff added in addPassthroughCopy()
    for (let path of this.passthroughManager.getConfigPathGlobs()) {
      paths.add(path);
    }
    // non-template language extensions
    for (let path of this.extensionMap.getPassthroughCopyGlobs(this.inputDir)) {
      paths.add(path);
    }
    return Array.from(paths);
  }

  restart() {
    this.passthroughManager.reset();
    this.setupGlobs();
    this._glob = null;
  }

  /* For testing */
  _setConfig(config) {
    if (!config.ignores) {
      config.ignores = new Set();
      config.ignores.add("node_modules/**");
    }
    this.config = config;
    this.initConfig();
  }

  /* Set command root for local project paths */
  // This is only used by tests
  _setLocalPathRoot(dir) {
    this.localPathRoot = dir;
  }

  set extensionMap(extensionMap) {
    this._extensionMap = extensionMap;
  }

  get extensionMap() {
    // for tests
    if (!this._extensionMap) {
      this._extensionMap = new EleventyExtensionMap(
        this.formats,
        this.eleventyConfig
      );
      this._extensionMap.config = this.config;
    }
    return this._extensionMap;
  }

  setPassthroughAll(passthroughAll) {
    this.passthroughAll = !!passthroughAll;
  }

  initPassthroughManager() {
    let mgr = new TemplatePassthroughManager(this.eleventyConfig);
    mgr.setInputDir(this.inputDir);
    mgr.setOutputDir(this.outputDir);
    mgr.extensionMap = this.extensionMap;
    this.passthroughManager = mgr;
  }

  getPassthroughManager() {
    return this.passthroughManager;
  }

  setPassthroughManager(mgr) {
    mgr.extensionMap = this.extensionMap;
    this.passthroughManager = mgr;
  }

  set templateData(templateData) {
    this._templateData = templateData;
  }

  get templateData() {
    if (!this._templateData) {
      this._templateData = new TemplateData(this.inputDir, this.eleventyConfig);
    }
    return this._templateData;
  }

  getDataDir() {
    let data = this.templateData;

    return data.getDataDir();
  }

  setupGlobs() {
    this.fileIgnores = this.getIgnores();
    this.extraIgnores = this._getIncludesAndDataDirs();
    this.uniqueIgnores = this.getIgnoreGlobs();

    // Conditional added for tests that don’t have a config
    if (this.config && this.config.events) {
      this.config.events.emit("eleventy.ignores", this.uniqueIgnores);
    }

    if (this.passthroughAll) {
      this.normalizedTemplateGlobs = TemplateGlob.map([
        TemplateGlob.normalizePath(this.input, "/**"),
      ]);
    } else {
      this.normalizedTemplateGlobs = this.templateGlobs;
    }
  }

  getIgnoreGlobs() {
    let uniqueIgnores = new Set();
    for (let ignore of this.fileIgnores) {
      uniqueIgnores.add(ignore);
    }
    for (let ignore of this.extraIgnores) {
      uniqueIgnores.add(ignore);
    }
    return Array.from(uniqueIgnores);
  }

  static getFileIgnores(ignoreFiles) {
    if (!Array.isArray(ignoreFiles)) {
      ignoreFiles = [ignoreFiles];
    }

    let ignores = [];
    for (let ignorePath of ignoreFiles) {
      ignorePath = TemplatePath.normalize(ignorePath);

      let dir = TemplatePath.getDirFromFilePath(ignorePath);

      if (fs.existsSync(ignorePath) && fs.statSync(ignorePath).size > 0) {
        let ignoreContent = fs.readFileSync(ignorePath, "utf8");

        ignores = ignores.concat(
          EleventyFiles.normalizeIgnoreContent(dir, ignoreContent)
        );
      }
    }

    ignores.forEach((path) => debug(`${ignoreFiles} ignoring: ${path}`));

    return ignores;
  }

  static normalizeIgnoreContent(dir, ignoreContent) {
    let ignores = [];

    if (ignoreContent) {
      ignores = ignoreContent
        .split("\n")
        .map((line) => {
          return line.trim();
        })
        .filter((line) => {
          if (line.charAt(0) === "!") {
            debug(
              ">>> When processing .gitignore/.eleventyignore, Eleventy does not currently support negative patterns but encountered one:"
            );
            debug(">>>", line);
            debug(
              "Follow along at https://github.com/11ty/eleventy/issues/693 to track support."
            );
          }

          // empty lines or comments get filtered out
          return (
            line.length > 0 && line.charAt(0) !== "#" && line.charAt(0) !== "!"
          );
        })
        .map((line) => {
          let path = TemplateGlob.normalizePath(dir, "/", line);
          path = TemplatePath.addLeadingDotSlash(
            TemplatePath.relativePath(path)
          );

          try {
            // Note these folders must exist to get /** suffix
            let stat = fs.statSync(path);
            if (stat.isDirectory()) {
              return path + "/**";
            }
            return path;
          } catch (e) {
            return path;
          }
        });
    }

    return ignores;
  }

  setEleventyIgnoreContent(content) {
    this.eleventyIgnoreContent = content;
  }

  getIgnores() {
    let rootDirectory = this.localPathRoot || ".";
    let files = [];

    for (let ignore of this.config.ignores) {
      files = files.concat(TemplateGlob.normalizePath(rootDirectory, ignore));
    }

    if (this.config.useGitIgnore) {
      files = files.concat(
        EleventyFiles.getFileIgnores([
          TemplatePath.join(rootDirectory, ".gitignore"),
        ])
      );
    }

    if (this.eleventyIgnoreContent !== false) {
      files = files.concat(this.eleventyIgnoreContent);
    } else {
      let absoluteInputDir = TemplatePath.absolutePath(this.inputDir);
      let eleventyIgnoreFiles = [
        TemplatePath.join(rootDirectory, ".eleventyignore"),
      ];
      if (rootDirectory !== absoluteInputDir) {
        eleventyIgnoreFiles.push(
          TemplatePath.join(this.inputDir, ".eleventyignore")
        );
      }

      files = files.concat(EleventyFiles.getFileIgnores(eleventyIgnoreFiles));
    }

    // ignore output dir unless that would exclude all input
    if (!TemplatePath.startsWithSubPath(this.inputDir, this.outputDir)) {
      files = files.concat(TemplateGlob.map(this.outputDir + "/**"));
    }

    return files;
  }

  getIncludesDir() {
    return this.includesDir;
  }

  getLayoutsDir() {
    return this.layoutsDir;
  }

  getFileGlobs() {
    return this.normalizedTemplateGlobs;
  }

  getRawFiles() {
    return this.templateGlobs;
  }

  getWatchPathCache() {
    // Issue #1325: make sure passthrough copy files are not included here
    if (!this.pathCache) {
      throw new Error(
        "Watching requires `.getFiles()` to be called first in EleventyFiles"
      );
    }

    // Filter out the passthrough copy paths.
    return this.pathCache.filter((path) => {
      return (
        this.extensionMap.isFullTemplateFilePath(path) &&
        this.extensionMap.shouldSpiderJavaScriptDependencies(path)
      );
    });
  }

  _globSearch() {
    if (this._glob) {
      return this._glob;
    }

    let globs = this.getFileGlobs();

    // returns a promise
    debug("Searching for: %o", globs);

    this._glob = fastglob(globs, {
      caseSensitiveMatch: false,
      dot: true,
      ignore: this.uniqueIgnores,
    });

    return this._glob;
  }

  async getFiles() {
    let bench = aggregateBench.get("Searching the file system");
    bench.before();
    let globResults = await this._globSearch();
    let paths = TemplatePath.addLeadingDotSlashArray(globResults);
    bench.after();

    // filter individual paths in the new config-specified extension
    // where is this used?
    if ("extensionMap" in this.config) {
      let extensions = this.config.extensionMap;
      if (Array.from(extensions).filter((entry) => !!entry.filter).length) {
        paths = paths.filter(function (path) {
          for (let entry of extensions) {
            if (entry.filter && path.endsWith(`.${entry.extension}`)) {
              return entry.filter(path);
            }
          }
          return true;
        });
      }
    }

    this.pathCache = paths;
    return paths;
  }

  // Assumption here that filePath is not a passthrough copy file
  isFullTemplateFile(paths, filePath) {
    for (let path of paths) {
      if (path === filePath) {
        return true;
      }
    }

    return false;
  }

  /* For `eleventy --watch` */
  getGlobWatcherFiles() {
    // TODO is it better to tie the includes and data to specific file extensions or keep the **?
    return this.validTemplateGlobs
      .concat(this.passthroughGlobs)
      .concat(this._getIncludesAndDataDirs());
  }

  /* For `eleventy --watch` */
  async getGlobWatcherTemplateDataFiles() {
    let templateData = this.templateData;
    return await templateData.getTemplateDataFileGlob();
  }

  /* For `eleventy --watch` */
  // TODO this isn’t great but reduces complexity avoiding using TemplateData:getLocalDataPaths for each template in the cache
  async getWatcherTemplateJavaScriptDataFiles() {
    let globs = await this.templateData.getTemplateJavaScriptDataFileGlob();
    let bench = aggregateBench.get("Searching the file system");
    bench.before();
    let results = TemplatePath.addLeadingDotSlashArray(
      await fastglob(globs, {
        ignore: ["**/node_modules/**"],
        caseSensitiveMatch: false,
        dot: true,
      })
    );
    bench.after();
    return results;
  }

  /* Ignored by `eleventy --watch` */
  getGlobWatcherIgnores() {
    // convert to format without ! since they are passed in as a separate argument to glob watcher
    return this.fileIgnores.map((ignore) =>
      TemplatePath.stripLeadingDotSlash(ignore)
    );
  }

  _getIncludesAndDataDirs() {
    let files = [];
    // we want this to fail on "" because we don’t want to ignore the
    // entire input directory when using ""
    if (this.config.dir.includes) {
      files = files.concat(TemplateGlob.map(this.includesDir + "/**"));
    }

    // we want this to fail on "" because we don’t want to ignore the
    // entire input directory when using ""
    if (this.config.dir.layouts) {
      files = files.concat(TemplateGlob.map(this.layoutsDir + "/**"));
    }

    if (this.config.dir.data && this.config.dir.data !== ".") {
      let dataDir = this.getDataDir();
      files = files.concat(TemplateGlob.map(dataDir + "/**"));
    }

    return files;
  }
}

module.exports = EleventyFiles;
