const { createHash } = require("crypto");

class PrecompiledNunjucks {
  constructor() {
    this.rawTemplates = {};
  }

  getPrecompiledTemplateKey(str) {
    let hash = createHash("sha256");
    hash.update(str);
    return "EleventyEdgeNunjucksPrecompile:" + hash.digest("hex");
  }

  setLibraries({ nunjucks, nunjucksEnv }) {
    this.nunjucks = nunjucks;
    this.nunjucksEnv = nunjucksEnv;
  }

  add(str) {
    // for precompiled template object key
    let key = this.getPrecompiledTemplateKey(str);
    this.rawTemplates[key] = str;
    return key;
  }

  toString() {
    let ret = [];
    if (Object.keys(this.rawTemplates).length > 0) {
      if (!this.nunjucks || !this.nunjucksEnv) {
        throw new Error("Missing Nunjucks and Nunjucks environment");
      }

      for (let key in this.rawTemplates) {
        let precompiled = this.nunjucks.precompileString(
          this.rawTemplates[key],
          {
            name: key,
            env: this.nunjucksEnv,
            asFunction: true,
            force: true,
            wrapper: function ([tmpl], opts) {
              // console.log( { templates, opts } );
              return `(function() {${tmpl.template}}())`;
            },
          }
        );

        ret.push(`"${key}": ${precompiled},`);
      }
    }

    return `"nunjucksPrecompiled": {
  ${ret.join("\n")}
}`;
  }
}

module.exports = PrecompiledNunjucks;
