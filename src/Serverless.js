const path = require("path");
const fs = require("fs");
const { match } = require("path-to-regexp");
const { TemplatePath } = require("@11ty/eleventy-utils");

const Eleventy = require("./Eleventy");
const deleteRequireCache = require("./Util/DeleteRequireCache");
const debug = require("debug")("Eleventy:Serverless");

class Serverless {
  constructor(name, path, options = {}) {
    this.name = name;

    // second argument is path
    if (typeof path === "string") {
      this.path = path;
    } else {
      // options is the second argument and path is inside options
      options = path;
      this.path = options.path;
    }

    if (!this.path) {
      throw new Error(
        "`path` must exist in the options argument in Eleventy Serverless."
      );
    }

    // ServerlessBundlerPlugin hard-codes to this (even if you used a different file name)
    this.configFilename = "eleventy.config.js";

    // Configuration Information
    this.configInfoFilename = "eleventy-serverless.json";

    // Maps input files to eligible serverless URLs
    this.mapFilename = "eleventy-serverless-map.json";

    this.options = Object.assign(
      {
        inputDir: null, // override only, we now inject this.
        functionsDir: "functions/",
        matchUrlToPattern(path, urlToCompare) {
          let fn = match(urlToCompare, { decode: decodeURIComponent });
          return fn(path);
        },
        // Query String Parameters
        query: {},
        // Inject shared collections
        precompiledCollections: {},
        // Configuration callback
        config: function (eleventyConfig) {},
      },
      options
    );

    this.dir = this.getProjectDir();
  }

  initializeEnvironmentVariables() {
    // set and delete env variables to make it work the same on --serve
    this.serverlessEnvironmentVariableAlreadySet =
      !!process.env.ELEVENTY_SERVERLESS;
    if (!this.serverlessEnvironmentVariableAlreadySet) {
      process.env.ELEVENTY_SERVERLESS = true;
    }
  }

  deleteEnvironmentVariables() {
    if (!this.serverlessEnvironmentVariableAlreadySet) {
      delete process.env.ELEVENTY_SERVERLESS;
    }
  }

  getProjectDir() {
    // TODO? improve with process.env.LAMBDA_TASK_ROOT—was `/var/task/` on lambda (not local)
    let dir = path.join(this.options.functionsDir, this.name);
    let paths = [
      path.join(TemplatePath.getWorkingDir(), dir), // netlify dev
      path.join("/var/task/src/", dir), // AWS Lambda absolute path
      path.join(TemplatePath.getWorkingDir()), // after the chdir below
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
    // TODO dedicated reset method, don’t delete this every time
    deleteRequireCache(fullPath);

    let mapContent = require(fullPath);
    return mapContent;
  }

  getConfigInfo() {
    let fullPath = TemplatePath.absolutePath(this.dir, this.configInfoFilename);
    debug(`Including config info file from ${fullPath}`);
    // TODO dedicated reset method, don’t delete this every time
    deleteRequireCache(fullPath);

    let configInfo = require(fullPath);
    return configInfo;
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
          pathParams: result.params,
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

  async getOutput() {
    if (this.dir.startsWith("/var/task/")) {
      process.chdir(this.dir);
    }

    let inputDir =
      this.options.input ||
      this.options.inputDir ||
      this.getConfigInfo().dir.input;
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
    debug("Path params: %o", pathParams);
    debug(`Input path:  ${inputPath}`);

    // TODO (@zachleat) change to use this hook: https://github.com/11ty/eleventy/issues/1957
    this.initializeEnvironmentVariables();

    let elev = new Eleventy(this.options.input || inputPath, null, {
      configPath,
      inputDir,
      config: (eleventyConfig) => {
        if (Object.keys(this.options.precompiledCollections).length > 0) {
          eleventyConfig.setPrecompiledCollections(
            this.options.precompiledCollections
          );
        }

        // Add the params to Global Data
        let globalData = {
          query: this.options.query,
          path: pathParams,
        };

        eleventyConfig.addGlobalData("eleventy.serverless", globalData);

        if (this.options.config && typeof this.options.config === "function") {
          this.options.config(eleventyConfig);
        }
      },
    });

    let json = await elev.toJSON();

    // TODO (@zachleat)  https://github.com/11ty/eleventy/issues/1957
    this.deleteEnvironmentVariables();

    let filtered = json.filter((entry) => {
      return entry.inputPath === inputPath;
    });

    if (!filtered.length) {
      let err = new Error(
        `Couldn’t find any generated output from Eleventy (Input path: ${inputPath}, URL path parameters: ${JSON.stringify(
          pathParams
        )}).`
      );
      err.httpStatusCode = 404;
      throw err;
    }

    return filtered;
  }

  /* Deprecated, use `getOutput` directly instead. */
  async render() {
    let json = await this.getOutput();

    return json[0].content;
  }
}

module.exports = Serverless;
