const TemplatePath = require("./TemplatePath");
const fs = require("fs-extra");
const deleteRequireCache = require("./Util/DeleteRequireCache");

class IncrementalManager {
  constructor() {
    this.needsToWriteBuildFile = false;
  }

  init(isIncremental) {
    this.isIncremental = isIncremental;

    if (this.isIncremental) {
      this.cache = this.getBuildFileInfo();
    } else {
      // build files are only written when using incremental
      // so we need to delete the build file if buildinfo is invalid
      // (build ran without incremental)
      this.deleteBuildFile();
    }
  }

  get buildFileName() {
    return ".eleventybuildinfo.json";
  }

  get buildFilePath() {
    return TemplatePath.absolutePath(this.buildFileName);
  }

  async getBuildFileContent() {
    let content = [];
    for (let entry of this.cache) {
      content.push(JSON.stringify(entry[1]));
    }
    return `[${content.join(",")}]`;
  }

  async writeBuildFile() {
    if (this.isIncremental && this.needsToWriteBuildFile) {
      return fs.outputFile(
        this.buildFilePath,
        await this.getBuildFileContent()
      );
    }
  }

  async deleteBuildFile() {
    return fs.remove(this.buildFilePath);
  }

  getBuildFileInfo() {
    let savedCache = new Map();
    let buildInfo = [];

    deleteRequireCache(this.buildFilePath);
    try {
      buildInfo = require(this.buildFilePath);
    } catch (e) {
      buildInfo = [];
      if (e.code !== "MODULE_NOT_FOUND") {
        throw e;
      }
    }

    for (let entry of buildInfo) {
      savedCache.set(
        this.getCacheKey(entry.inputFile, entry.outputPath),
        entry
      );
    }

    return savedCache;
  }

  getCache(inputFile, outputPath) {
    return this.cache.get(this.getCacheKey(inputFile, outputPath));
  }

  getCacheKey(inputFile, outputPath) {
    return JSON.stringify({ in: inputFile, out: outputPath });
  }

  getCacheValue(inputFile, outputPath, content) {
    return {
      inputFile: inputFile,
      outputPath: outputPath,
      content: this.getHashedContent(content)
    };
  }

  getHashedContent(content) {
    // const hash = crypto.createHash('sha256');
    // hash.update(content);
    // return hash.digest("hex");

    const farmhash = require("farmhash");

    return farmhash.fingerprint64(content);
  }

  add(inputFile, outputPath, content) {
    if (this.isIncremental) {
      // This is only called in TemplateWriter if a shouldWriteFile check has already passed
      this.needsToWriteBuildFile = true;

      this.cache.set(
        this.getCacheKey(inputFile, outputPath),
        this.getCacheValue(inputFile, outputPath, content)
      );
    }
  }

  shouldWriteFile(inputFile, outputPath, content) {
    if (!this.isIncremental) {
      return true;
    }

    let cached = this.getCache(inputFile, outputPath);
    if (!cached || this.getHashedContent(content) !== cached.content) {
      return true;
    }
    return false;
  }
}

module.exports = IncrementalManager;
