const parsePath = require("parse-filepath");
const TemplatePath = require("./TemplatePath");
const normalize = require("normalize-path");
const isPlainObject = require("lodash/isPlainObject");

class TemplatePermalink {
  // `link` with template syntax should have already been rendered in Template.js
  constructor(link, extraSubdir) {
    let isLinkAnObject = isPlainObject(link);

    this._isRendered = true;
    this._writeToFileSystem = true;

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
      if (rawLink === false) {
        this._writeToFileSystem = false;
      } else {
        throw new Error(
          `\`permalink: ${
            isLinkAnObject ? "build: " : ""
          }true\` is not a supported feature in Eleventy. Did you mean \`permalink: ${
            isLinkAnObject ? "build: " : ""
          }false\`?`
        );
      }
    } else if (rawLink) {
      this.rawLink = rawLink;
    }

    this.serverlessUrls = {};

    if (isLinkAnObject) {
      Object.assign(this.serverlessUrls, link);
      delete this.serverlessUrls.build;

      // default if permalink is an Object but does not have a `build` prop
      // note that this will opt-out this template from collections. See TemplateBehavior->isIncludedInCollections
      if (!("build" in link)) {
        this._writeToFileSystem = false;
        this._isRendered = false;
      }
    }

    this.extraPaginationSubdir = extraSubdir || "";
  }

  getServerlessUrls() {
    return this.serverlessUrls;
  }

  _cleanLink(link) {
    return link + (link.substr(-1) === "/" ? "index.html" : "");
  }

  toLink() {
    if (!this.rawLink) {
      // empty or false
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

  // This method is used to generate the `page.url` variable.
  // Note that in serverless mode this should still exist to generate the content map

  // remove all index.html’s from links
  // index.html becomes /
  // test/index.html becomes test/
  toHref() {
    if (!this.rawLink) {
      // empty or false
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
