const lodashSet = require("lodash/set");
const debug = require("debug")("Eleventy:ComputedDataTemplateString");

class ComputedDataTemplateString {
  constructor(computedKeys) {
    if (Array.isArray(computedKeys)) {
      this.computedKeys = new Set(computedKeys);
    } else {
      this.computedKeys = computedKeys;
    }

    // is this ¯\_(lisp)_/¯
    // must be strings that won’t be escaped by template languages
    this.prefix = "(((((11ty(((((";
    this.suffix = ")))))11ty)))))";
  }

  getProxyData() {
    let proxyData = {};

    // use these special strings as a workaround to check the rendered output
    // can’t use proxies here as some template languages trigger proxy for all
    // keys in data
    for (let key of this.computedKeys) {
      // TODO don’t allow to set eleventyComputed.page? other disallowed computed things?
      lodashSet(proxyData, key, this.prefix + key + this.suffix);
    }

    return proxyData;
  }

  findVarsInOutput(output = "") {
    let vars = new Set();
    let splits = output.split(this.prefix);
    for (let split of splits) {
      let varName = split.substr(0, split.indexOf(this.suffix));
      if (varName) {
        vars.add(varName);
      }
    }
    return Array.from(vars);
  }

  async findVarsUsed(fn, data = {}) {
    let proxyData = this.getProxyData();
    let output;
    let savedLog = console.log;
    console.log = () => {};
    // Mitigation for #1061, errors with filters in the first pass shouldn’t fail the whole thing.
    try {
      output = await fn(proxyData);
    } catch (e) {
      debug("Computed Data first pass data resolution error: %o", e);
    }
    console.log = savedLog;

    return this.findVarsInOutput(output);
  }
}

module.exports = ComputedDataTemplateString;
