const parsePath = require("parse-filepath");
const TemplatePath = require("./TemplatePath");
const normalize = require("normalize-path");
const isPlainObject = require("lodash/isPlainObject");

class TemplatePermalink {
  // `link` with template syntax should have already been rendered in Template.js
  constructor(link, extraSubdir) {
    // these defaults may get overriden below
    this.isProcessible = true;
    this.outputToFileSystem = true;

    if (link === true) {
      throw new Error(
        "`permalink: true` is not a supported feature in Eleventy. Did you mean `permalink: false`?"
      );
    }
    if (link === false) {
      // permalink: false // doesn’t match `permalink: build: false` only for backwards compat
      this.outputToFileSystem = false;
      return;
    }

    let rawLink;
    if (isPlainObject(link)) {
      if ("build" in link) {
        rawLink = link.build;
        // permalink: build: true
        // permalink: build: false
        if (typeof rawLink === "boolean") {
          this.outputToFileSystem = false;
          this.isProcessible = rawLink;
        }
      } else {
        // opt out of build
        this.outputToFileSystem = false;
        this.isProcessible = false;
      }
    } else {
      rawLink = link;
    }

    this.rawLink = rawLink;
    this.extraPaginationSubdir = extraSubdir || "";
  }

  _cleanLink(link) {
    return link + (link.substr(-1) === "/" ? "index.html" : "");
  }

  toLink() {
    if (!this.outputToFileSystem) {
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
    if (!this.outputToFileSystem) {
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

  isTemplateProcessable() {
    return this.isProcessible;
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
