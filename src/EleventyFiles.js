const fs = require("fs-extra");
const fastglob = require("fast-glob");

const EleventyExtensionMap = require("./EleventyExtensionMap");
const TemplateData = require("./TemplateData");
const TemplateGlob = require("./TemplateGlob");
const TemplatePath = require("./TemplatePath");
const TemplatePassthroughManager = require("./TemplatePassthroughManager");

const config = require("./Config");
const debug = require("debug")("Eleventy:EleventyFiles");
// const debugDev = require("debug")("Dev:Eleventy:EleventyFiles");

class EleventyFiles {
  constructor(input, outputDir, formats, passthroughAll) {
    this.config = config.getConfig();
    this.input = input;
    this.inputDir = TemplatePath.getDir(this.input);
    this.outputDir = outputDir;

    this.initConfig();

    this.passthroughAll = !!passthroughAll;

    this.formats = formats;
    this.extensionMap = new EleventyExtensionMap(formats);
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
    this.initFormatsGlobs();
    this.setPassthroughManager();
    this.setupGlobs();
  }

  restart() {
    this.passthroughManager.reset();
    this.setupGlobs();
  }

  /* For testing */
  _setConfig(config) {
    this.config = config;
    this.initConfig();
  }
  /* For testing */
  _setExtensionMap(map) {
    this.extensionMap = map;
  }
  /* Set command root for local project paths */
  _setLocalPathRoot(dir) {
    this.localPathRoot = dir;
  }

  setPassthroughAll(passthroughAll) {
    this.passthroughAll = !!passthroughAll;
  }

  initFormatsGlobs() {
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

  setTemplateData(templateData) {
    this.templateData = templateData;
  }

  // TODO make this a getter
  getTemplateData() {
    if (!this.templateData) {
      this.templateData = new TemplateData(this.inputDir);
    }
    return this.templateData;
  }

  getDataDir() {
    let data = this.getTemplateData();

    return data.getDataDir();
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

  static getFileIgnores(ignoreFiles, defaultIfFileDoesNotExist) {
    if (!Array.isArray(ignoreFiles)) {
      ignoreFiles = [ignoreFiles];
    }

    let ignores = [];
    let fileFound = false;
    let dirs = [];
    for (let ignorePath of ignoreFiles) {
      ignorePath = TemplatePath.normalize(ignorePath);

      let dir = TemplatePath.getDirFromFilePath(ignorePath);
      dirs.push(dir);

      if (fs.existsSync(ignorePath) && fs.statSync(ignorePath).size > 0) {
        fileFound = true;
        let ignoreContent = fs.readFileSync(ignorePath, "utf-8");

        // make sure that empty .gitignore with spaces takes default ignore.
        if (ignoreContent.trim().length === 0) {
          fileFound = false;
        } else {
          ignores = ignores.concat(
            EleventyFiles.normalizeIgnoreContent(dir, ignoreContent)
          );
        }
      }
    }

    if (!fileFound && defaultIfFileDoesNotExist) {
      ignores.push("!" + TemplateGlob.normalizePath(defaultIfFileDoesNotExist));
      for (let dir of dirs) {
        ignores.push(
          "!" + TemplateGlob.normalizePath(dir, defaultIfFileDoesNotExist)
        );
      }
    }

    ignores.forEach(function(path) {
      debug(`${ignoreFiles} ignoring: ${path}`);
    });
    return ignores;
  }

  static normalizeIgnoreContent(dir, ignoreContent) {
    let ignores = [];

    if (ignoreContent) {
      ignores = ignoreContent
        .split("\n")
        .map(line => {
          return line.trim();
        })
        .filter(line => {
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
        .map(line => {
          let path = TemplateGlob.normalizePath(dir, "/", line);
          path = TemplatePath.addLeadingDotSlash(
            TemplatePath.relativePath(path)
          );

          try {
            // Note these folders must exist to get /** suffix
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
    let rootDirectory = this.localPathRoot || TemplatePath.getWorkingDir();
    let absoluteInputDir = TemplatePath.absolutePath(this.inputDir);
    if (this.config.useGitIgnore) {
      let gitIgnores = [TemplatePath.join(rootDirectory, ".gitignore")];
      if (rootDirectory !== absoluteInputDir) {
        gitIgnores.push(TemplatePath.join(this.inputDir, ".gitignore"));
      }

      files = files.concat(
        EleventyFiles.getFileIgnores(gitIgnores, "node_modules/**")
      );
    }

    if (this.config.eleventyignoreOverride !== false) {
      let eleventyIgnores = [
        TemplatePath.join(rootDirectory, ".eleventyignore")
      ];
      if (rootDirectory !== absoluteInputDir) {
        eleventyIgnores.push(
          TemplatePath.join(this.inputDir, ".eleventyignore")
        );
      }

      files = files.concat(
        this.config.eleventyignoreOverride ||
          EleventyFiles.getFileIgnores(eleventyIgnores)
      );
    }

    files = files.concat(TemplateGlob.map("!" + this.outputDir + "/**"));

    return files;
  }

  getIncludesDir() {
    return this.includesDir;
  }

  getLayoutsDir() {
    return this.layoutsDir;
  }

  getFileGlobs() {
    return this.templateGlobsWithIgnores;
  }

  getRawFiles() {
    return this.templateGlobs;
  }

  getWatchPathCache() {
    return this.pathCache;
  }

  async getFiles() {
    let globs = this.getFileGlobs();

    debug("Searching for: %o", globs);
    let paths = TemplatePath.addLeadingDotSlashArray(
      await fastglob(globs, {
        caseSensitiveMatch: false,
        dot: true
      })
    );
    this.pathCache = paths;
    return paths;
  }

  getGlobWatcherFiles() {
    // TODO is it better to tie the includes and data to specific file extensions or keep the **?
    return this.templateGlobs
      .concat(this.getIncludesAndDataDirs())
      .concat(this.getPassthroughManager().getConfigPathGlobs());
  }

  async getGlobWatcherTemplateDataFiles() {
    let templateData = this.getTemplateData();
    return await templateData.getTemplateDataFileGlob();
  }

  // TODO this isn’t great but reduces complexity avoiding using TemplateData:getLocalDataPaths for each template in the cache
  async getWatcherTemplateJavaScriptDataFiles() {
    let globs = await this.getTemplateData().getTemplateJavaScriptDataFileGlob();
    return TemplatePath.addLeadingDotSlashArray(
      await fastglob(globs, {
        ignore: ["**/node_modules/**"],
        caseSensitiveMatch: false,
        dot: true
      })
    );
  }

  getGlobWatcherIgnores() {
    // convert to format without ! since they are passed in as a separate argument to glob watcher
    return this.ignores.map(ignore =>
      TemplatePath.stripLeadingDotSlash(ignore.substr(1))
    );
  }

  getPassthroughPaths() {
    let paths = [];
    paths = paths.concat(this.passthroughManager.getConfigPaths());
    // These are already added in the root templateGlobs
    // paths = paths.concat(this.extensionMap.getPrunedGlobs(this.inputDir));
    return paths;
  }

  getIncludesAndDataDirs() {
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

  getTemplateIgnores() {
    return this.getIncludesAndDataDirs().map(function(dir) {
      return "!" + dir;
    });
  }
}

module.exports = EleventyFiles;
