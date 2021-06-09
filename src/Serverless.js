const path = require("path");
const fs = require("fs");

const Eleventy = require("./Eleventy");
const TemplatePath = require("./TemplatePath");
const UrlPattern = require("url-pattern");
const debug = require("debug")("Eleventy:Serverless");

class Serverless {
  constructor(name, path, options = {}) {
    this.name = name;
    this.path = path;

    // ServerlessBundlerPlugin hard-codes to this (even if you used a different file name)
    this.configFilename = "eleventy.config.js";

    // Maps input files to eligible serverless URLs
    this.mapFilename = "eleventy-serverless-map.json";

    this.options = Object.assign(
      {
        inputDir: ".",
        functionsDir: "functions/",
        // Query String Parameters
        matchUrlToPattern(path, urlToCompare) {
          let pattern = new UrlPattern(urlToCompare);
          return pattern.match(path);
        },
        query: {},
        // Inject shared collections
        precompiledCollections: {},
      },
      options
    );

    this.dir = this.getProjectDir();
  }

  getProjectDir() {
    // TODO? improve with process.env.LAMBDA_TASK_ROOT—was `/var/task/` on lambda (not local)
    let dir = path.join(this.options.functionsDir, this.name);
    let paths = [
      path.join(TemplatePath.getWorkingDir(), dir), // netlify dev
      path.join("/var/task/src/", dir), // AWS Lambda absolute path
    ];

    for (let path of paths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }

    throw new Error(
      `Couldn’t find the "${dir}" directory. Looked in: ${paths}`
    );
  }

  getContentMap() {
    let fullPath = TemplatePath.absolutePath(this.dir, this.mapFilename);
    debug(
      `Including content map (maps output URLs to input files) from ${fullPath}`
    );
    return require(fullPath);
  }

  isServerlessUrl(urlPath) {
    let contentMap = this.getContentMap();

    for (let url in contentMap) {
      if (this.options.matchUrlToPattern(urlPath, url)) {
        return true;
      }
    }
    return false;
  }

  matchUrlPattern(urlPath) {
    let contentMap = this.getContentMap();
    let matches = [];

    for (let url in contentMap) {
      let result = this.options.matchUrlToPattern(urlPath, url);
      if (result) {
        matches.push({
          compareTo: url,
          pathParams: result,
          inputPath: contentMap[url],
        });
      }
    }

    if (matches.length) {
      if (matches.length > 1) {
        console.log(
          `Eleventy Serverless conflict: there are multiple serverless paths that match the current URL (${urlPath}): ${JSON.stringify(
            matches,
            null,
            2
          )}`
        );
      }
      return matches[0];
    }

    return {};
  }

  async render() {
    // TODO is this necessary?
    if (this.dir.startsWith("/var/task/")) {
      process.chdir(this.dir);
    }

    let inputDir = path.join(this.dir, this.options.inputDir);
    let configPath = path.join(this.dir, this.configFilename);
    let { pathParams, inputPath } = this.matchUrlPattern(this.path);

    if (!pathParams || !inputPath) {
      let err = new Error(
        `No matching URL found for ${this.path} in ${JSON.stringify(
          this.getContentMap()
        )}`
      );
      err.httpStatusCode = 404;
      throw err;
    }

    debug(`Current dir: ${process.cwd()}`);
    debug(`Project dir: ${this.dir}`);
    debug(`Config path:  ${configPath}`);

    debug(`Input dir: ${inputDir}`);
    debug(`Requested URL:  ${this.path}`);
    debug(`Path params:  ${pathParams}`);
    debug(`Input path:  ${inputPath}`);

    let elev = new Eleventy(inputPath, null, {
      configPath,
      config: (eleventyConfig) => {
        if (Object.keys(this.options.precompiledCollections).length > 0) {
          eleventyConfig.setPrecompiledCollections(
            this.options.precompiledCollections
          );
        }

        // Add the params to Global Data
        eleventyConfig.addGlobalData("eleventy.serverless", {
          query: this.options.query,
          path: pathParams,
        });
      },
    });

    elev.setInputDir(inputDir);
    await elev.init();

    let json = await elev.toJSON();
    if (!json.length) {
      let err = new Error(
        `Couldn’t find any generated output from Eleventy (URL path parameters: ${JSON.stringify(
          pathParams
        )}).`
      );
      err.httpStatusCode = 404;
      throw err;
    }

    for (let entry of json) {
      if (entry.inputPath === inputPath) {
        return entry.content;
      }
    }

    // Log to Serverless Function output
    console.log(json);
    throw new Error(
      `Couldn’t find any matching output from Eleventy for ${inputPath} (${json.length} pages rendered).`
    );
  }
}

module.exports = Serverless;
