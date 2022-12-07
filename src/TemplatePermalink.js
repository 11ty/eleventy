const path = require("path");
const normalize = require("normalize-path");
const { TemplatePath, isPlainObject } = require("@11ty/eleventy-utils");

const serverlessUrlFilter = require("./Filters/ServerlessUrl");

class TemplatePermalink {
  // `link` with template syntax should have already been rendered in Template.js
  constructor(link, extraSubdir) {
    let isLinkAnObject = isPlainObject(link);

    this._isRendered = true;
    this._writeToFileSystem = true;

    let buildLink;

    if (isLinkAnObject) {
      if ("build" in link) {
        buildLink = link.build;
      }

      // find the first string key
      for (let key in link) {
        if (typeof key !== "string") {
          continue;
        }
        if (key !== "build" && link[key] !== false) {
          this.primaryServerlessUrl = link[key]; // can be an array or string
        }
        break;
      }
    } else {
      buildLink = link;
    }

    // permalink: false and permalink: build: false
    if (typeof buildLink === "boolean") {
      if (buildLink === false) {
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
    } else if (buildLink) {
      this.buildLink = buildLink;
    }

    this.serverlessUrls = {};

    if (isLinkAnObject) {
      Object.assign(this.serverlessUrls, link);
      delete this.serverlessUrls.build;

      // default if permalink is an Object but does not have a `build` prop
      if (!("build" in link)) {
        this._writeToFileSystem = false;
        this._isRendered = false;
      }
    }

    this.extraPaginationSubdir = extraSubdir || "";
  }

  setUrlTransforms(transforms) {
    this._urlTransforms = transforms;
  }

  get urlTransforms() {
    return this._urlTransforms || [];
  }

  setServerlessPathData(data) {
    this.serverlessPathData = data;
  }

  getServerlessUrls() {
    return this.serverlessUrls;
  }

  _addDefaultLinkFilename(link) {
    return link + (link.slice(-1) === "/" ? "index.html" : "");
  }

  toOutputPath() {
    if (!this.buildLink) {
      // empty or false
      return false;
    }

    let cleanLink = this._addDefaultLinkFilename(this.buildLink);
    let parsed = path.parse(cleanLink);

    return TemplatePath.join(
      parsed.dir,
      this.extraPaginationSubdir,
      parsed.base
    );
  }

  // Used in url transforms feature
  static getUrlStem(original) {
    let subject = original;
    if (original.endsWith(".html")) {
      subject = original.slice(0, -1 * ".html".length);
    }
    return TemplatePermalink.normalizePathToUrl(subject);
  }

  static normalizePathToUrl(original) {
    let compare = original || "";

    let needleHtml = "/index.html";
    let needleBareTrailingSlash = "/index/";
    let needleBare = "/index";
    if (compare.endsWith(needleHtml)) {
      return compare.slice(0, compare.length - needleHtml.length) + "/";
    } else if (compare.endsWith(needleBareTrailingSlash)) {
      return (
        compare.slice(0, compare.length - needleBareTrailingSlash.length) + "/"
      );
    } else if (compare.endsWith(needleBare)) {
      return compare.slice(0, compare.length - needleBare.length) + "/";
    }

    return original;
  }

  // This method is used to generate the `page.url` variable.
  // Note that in serverless mode this should still exist to generate the content map

  // remove all index.html’s from links
  // index.html becomes /
  // test/index.html becomes test/
  toHref() {
    if (this.primaryServerlessUrl) {
      if (this.serverlessPathData) {
        let urls = serverlessUrlFilter(
          this.primaryServerlessUrl,
          this.serverlessPathData
        );

        // Array of *matching* serverless urls only
        if (Array.isArray(urls)) {
          // return first
          return urls[0];
        }

        return urls;
      }

      if (Array.isArray(this.primaryServerlessUrl)) {
        // return first
        return this.primaryServerlessUrl[0];
      }

      return this.primaryServerlessUrl;
    } else if (!this.buildLink) {
      // empty or false
      return false;
    }

    let transformedLink = this.toOutputPath();
    let original =
      (transformedLink.charAt(0) !== "/" ? "/" : "") + transformedLink;

    let normalized = TemplatePermalink.normalizePathToUrl(original) || "";
    for (let transform of this.urlTransforms) {
      original =
        transform({
          url: normalized,
          urlStem: TemplatePermalink.getUrlStem(original),
        }) ?? original;
    }

    return TemplatePermalink.normalizePathToUrl(original);
  }

  toPath(outputDir) {
    if (!this.buildLink) {
      return false;
    }

    let uri = this.toOutputPath();

    if (uri === false) {
      return false;
    }

    return normalize(outputDir + "/" + uri);
  }

  toPathFromRoot() {
    if (!this.buildLink) {
      return false;
    }

    let uri = this.toOutputPath();

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
    let path;
    if (fileExtension === "html") {
      let hasDupeFolder = TemplatePermalink._hasDuplicateFolder(
        dir,
        filenameNoExt
      );

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
