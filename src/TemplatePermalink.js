const parsePath = require("parse-filepath");
const TemplatePath = require("./TemplatePath");
const normalize = require("normalize-path");
const isPlainObject = require("lodash/isPlainObject");

class TemplatePermalink {
  // `link` with template syntax should have already been rendered in Template.js
  constructor(link, extraSubdir) {
    let isLinkAnObject = isPlainObject(link);

    this._isIgnoredTemplate = false;
    this._isRendered = true;
    this._outputToFileSystem = true;

    let rawLink;
    if (isLinkAnObject) {
      if ("build" in link) {
        rawLink = link.build;
      }
    } else {
      rawLink = link;
    }

    // permalink: false and permalink: build: false
    if (typeof rawLink === "boolean") {
      if(rawLink === false) {
        this._outputToFileSystem = false;
      } else {
        throw new Error(
          `\`permalink: ${isLinkAnObject ? "build: " : ""}true\` is not a supported feature in Eleventy. Did you mean \`permalink: ${isLinkAnObject ? "build: " : ""}false\`?`
        );
      }
    } else if(rawLink) {
      this.rawLink = rawLink;
    }

    if(isLinkAnObject) {
      if("external" in link) {
        this.externalLink = link.external;
      }

      // default for permalink objects without a build URL
      if(!("behavior" in link) && !("build" in link)) {
        link.behavior = "skip-render";
      }

      if(link.behavior === "skip-write") { // same as permalink: false and permalink: build: false
        this._outputToFileSystem = false;
      } else if(link.behavior === "skip-render") {
        this._outputToFileSystem = false;
        this._isRendered = false;
      } else if(link.behavior === "skip") {
        this._outputToFileSystem = false;
        this._isRendered = false;
        this._isIgnoredTemplate = true;
      }
    }

    this.extraPaginationSubdir = extraSubdir || "";
  }

  _cleanLink(link) {
    return link + (link.substr(-1) === "/" ? "index.html" : "");
  }

  toLink() {
    if (!this.rawLink) { // empty or false
      return false;
    }

    let cleanLink = this._cleanLink(this.rawLink);
    let parsed = parsePath(cleanLink);

    return TemplatePath.join(
      parsed.dir,
      this.extraPaginationSubdir,
      parsed.base
    );
  }

  // remove all index.html’s from links
  // index.html becomes /
  // test/index.html becomes test/
  toHref() {
    if(this.externalLink) {
      return this.externalLink;
    }
    if (!this.rawLink) { // empty or false
      return false;
    }

    let transformedLink = this.toLink();
    let original =
      (transformedLink.charAt(0) !== "/" ? "/" : "") + transformedLink;
    let needle = "/index.html";
    if (original === needle) {
      return "/";
    } else if (original.substr(-1 * needle.length) === needle) {
      return original.substr(0, original.length - needle.length) + "/";
    }
    return original;
  }

  toPath(outputDir) {
    let uri = this.toLink();

    if (uri === false) {
      return false;
    }

    return normalize(outputDir + "/" + uri);
  }

  toPathFromRoot() {
    let uri = this.toLink();

    if (uri === false) {
      return false;
    }

    return normalize(uri);
  }

  isTemplateIgnored() {
    return this._isIgnoredTemplate;
  }

  isTemplateRendered() {
    return this._isRendered;
  }

  isTemplateWriteable() {
    return this._outputToFileSystem;
  }

  static _hasDuplicateFolder(dir, base) {
    let folders = dir.split("/");
    if (!folders[folders.length - 1]) {
      folders.pop();
    }
    return folders[folders.length - 1] === base;
  }

  static generate(
    dir,
    filenameNoExt,
    extraSubdir,
    suffix,
    fileExtension = "html"
  ) {
    let hasDupeFolder = TemplatePermalink._hasDuplicateFolder(
      dir,
      filenameNoExt
    );
    let path;
    if (fileExtension === "html") {
      path =
        (dir ? dir + "/" : "") +
        (filenameNoExt !== "index" && !hasDupeFolder
          ? filenameNoExt + "/"
          : "") +
        "index" +
        (suffix || "") +
        ".html";
    } else {
      path =
        (dir ? dir + "/" : "") +
        filenameNoExt +
        (suffix || "") +
        "." +
        fileExtension;
    }

    return new TemplatePermalink(path, extraSubdir);
  }
}

module.exports = TemplatePermalink;
