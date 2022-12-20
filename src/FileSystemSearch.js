const fastglob = require("fast-glob");
const micromatch = require("micromatch");

const { TemplatePath } = require("@11ty/eleventy-utils");
const debug = require("debug")("Eleventy:FastGlobManager");

class FileSystemSearch {
  constructor() {
    this.inputs = {};
    this.outputs = {};
    this.promises = {};
    this.count = 0;
  }

  // returns a promise
  search(key, globs, options = {}) {
    debug("Glob search (%o) searching for: %o", key, globs);

    if (!Array.isArray(globs)) {
      globs = [globs];
    }

    // Strip leading slashes from everything!
    globs = globs.map((entry) => TemplatePath.stripLeadingDotSlash(entry));

    if (options.ignore && Array.isArray(options.ignore)) {
      options.ignore = options.ignore.map((entry) => TemplatePath.stripLeadingDotSlash(entry));
    }

    // Only after the promise has resolved
    if (this.outputs[key]) {
      return Array.from(this.outputs[key]);
    }

    if (!this.promises[key]) {
      this.inputs[key] = {
        input: globs,
        options,
      };

      this.count++;

      this.promises[key] = fastglob(
        globs,
        Object.assign(
          {
            caseSensitiveMatch: false, // insensitive
            dot: true,
          },
          options
        )
      ).then((results) => {
        this.outputs[key] = new Set(results.map((entry) => TemplatePath.addLeadingDotSlash(entry)));
        return Array.from(this.outputs[key]);
      });
    }

    // may be an unresolved promise
    return this.promises[key];
  }

  _modify(path, setOperation) {
    path = TemplatePath.stripLeadingDotSlash(path);

    let normalized = TemplatePath.addLeadingDotSlash(path);

    for (let key in this.inputs) {
      let { input, ignore } = this.inputs[key];

      if (
        micromatch([path], input, {
          dot: true,
          nocase: true, // insensitive
          ignore,
        }).length > 0
      ) {
        this.outputs[key][setOperation](normalized);
      }
    }
  }

  add(path) {
    this._modify(path, "add");
  }

  delete(path) {
    this._modify(path, "delete");
  }
}

module.exports = FileSystemSearch;
