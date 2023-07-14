const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const isGlob = require("is-glob");
const copy = require("recursive-copy");
const querystring = require("querystring");
const { TemplatePath } = require("@11ty/eleventy-utils");

const NetlifyRedirects = require("./Serverless/NetlifyRedirects");
const { EleventyRequire } = require("../Util/Require");
const DirContains = require("../Util/DirContains");
const JavaScriptDependencies = require("../Util/JavaScriptDependencies");
const deleteRequireCache = require("../Util/DeleteRequireCache");
const debug = require("debug")("Eleventy:Serverless");

// Provider specific
const redirectHandlers = {
  "netlify-toml": function (name, outputMap) {
    let r = new NetlifyRedirects(name);
    return r.writeFile(outputMap, "/.netlify/functions/");
  },
  "netlify-toml-functions": function (name, outputMap) {
    let r = new NetlifyRedirects(name);
    return r.writeFile(outputMap, "/.netlify/functions/");
  },
  "netlify-toml-builders": function (name, outputMap) {
    let r = new NetlifyRedirects(name);
    return r.writeFile(outputMap, "/.netlify/builders/");
  },
};

class BundlerHelper {
  constructor(name, options, eleventyConfig) {
    this.name = name;
    this.options = options;
    this.dir = path.join(options.functionsDir, name);
    if (path.isAbsolute(this.dir)) {
      throw new Error(
        "Absolute paths are not yet supported for `functionsDir` in the serverless bundler. Received: " +
          options.functionsDir
      );
    }

    this.copyCount = 0;
    this.eleventyConfig = eleventyConfig;
  }

  reset() {
    this.copyCount = 0;
  }

  getOutputPath(filepath) {
    return TemplatePath.addLeadingDotSlash(path.join(this.dir, filepath));
  }

  recursiveCopy(src, dest, options = {}) {
    // skip this one if not a glob and doesn’t exist
    if (!isGlob(src) && !fs.existsSync(src)) {
      return;
    }

    let finalDest = this.getOutputPath(dest || src);
    debug(`Eleventy Serverless: Copying ${src} to ${finalDest}`);

    return copy(
      src,
      finalDest,
      Object.assign(
        {
          overwrite: true,
          dot: false,
          junk: false,
          results: false,
        },
        this.options.copyOptions,
        options
      )
    ).on(copy.events.COPY_FILE_COMPLETE, () => {
      this.copyCount++;
    });
  }

  writeBundlerDependenciesFile(filename, deps = []) {
    let fullPath = this.getOutputPath(filename);
    if (deps.length === 0 && fs.existsSync(fullPath)) {
      return;
    }

    let modules = deps.map((name) => `require("${name}");`);
    fs.writeFileSync(fullPath, modules.join("\n"));
    this.copyCount++;
    debug(
      `Writing a file to make it very obvious to the serverless bundler which extra \`require\`s are needed from the config file (×${modules.length}): ${fullPath}`
    );
  }

  writeDependencyEntryFile() {
    // ensure these exist for requiring
    if (this.options.copyEnabled) {
      this.writeBundlerDependenciesFile("eleventy-app-config-modules.js");
      this.writeBundlerDependenciesFile("eleventy-app-globaldata-modules.js");
      this.writeBundlerDependenciesFile("eleventy-app-dirdata-modules.js");
    }

    // we write these even when copy is disabled because the serverless function expects it
    this.writeBundlerDependenciesFile(
      "eleventy-bundler-modules.js",
      this.options.copyEnabled
        ? [
            "./eleventy-app-config-modules.js",
            "./eleventy-app-globaldata-modules.js",
            "./eleventy-app-dirdata-modules.js",
          ]
        : []
    );
  }

  async copyFileList(fileList) {
    let promises = [];
    for (let file of fileList) {
      promises.push(this.recursiveCopy(file));
    }
    return Promise.all(promises);
  }

  // Does *not* copy the original files (only the deps)
  async processJavaScriptFiles(files, dependencyFilename) {
    if (!this.options.copyEnabled) {
      return;
    }

    let nodeModules = JavaScriptDependencies.getDependencies(files, true);
    this.writeBundlerDependenciesFile(
      dependencyFilename,
      nodeModules.filter((name) => this.options.excludeDependencies.indexOf(name) === -1)
    );

    let localModules = JavaScriptDependencies.getDependencies(files, false);
    // promise
    return this.copyFileList(localModules);
  }

  // https://github.com/11ty/eleventy/issues/2422
  // This behavior is dictated by AWS Lambda https://aws.amazon.com/blogs/compute/support-for-multi-value-parameters-in-amazon-api-gateway/
  // Duplicate keys are provided as a single comma separated string
  getSingleValueQueryParams(searchParams) {
    let obj = {};
    for (let [key, value] of searchParams) {
      if (!obj[key]) {
        obj[key] = value;
      } else {
        obj[key] += `, ${value}`;
      }
    }
    return obj;
  }

  // https://github.com/11ty/eleventy/issues/2422
  // This behavior is dictated by AWS Lambda https://aws.amazon.com/blogs/compute/support-for-multi-value-parameters-in-amazon-api-gateway/
  // Duplicate keys are combined into one array of values
  getMultiValueQueryParams(searchParams) {
    return querystring.parse(searchParams.toString());
  }

  serverMiddleware() {
    let serverlessFilepath = TemplatePath.addLeadingDotSlash(
      path.join(TemplatePath.getWorkingDir(), this.dir, "index")
    );

    return async function EleventyServerlessMiddleware(req, res, next) {
      deleteRequireCache(serverlessFilepath);

      let serverlessFunction = EleventyRequire(serverlessFilepath);
      let url = new URL(req.url, "http://localhost/"); // any domain will do here, we just want the searchParams

      let start = new Date();
      let result = await serverlessFunction.handler({
        httpMethod: "GET",
        path: url.pathname,
        rawUrl: url.toString(),

        // @netlify/functions builder overwrites these to {} intentionally
        // See https://github.com/netlify/functions/issues/38
        queryStringParameters: this.getSingleValueQueryParams(url.searchParams),
        multiValueQueryStringParameters: this.getMultiValueQueryParams(url.searchParams),
      });

      if (result.statusCode === 404) {
        // return static file
        return next();
      }

      res.writeHead(result.statusCode, result.headers || {});
      res.write(result.body);

      this.eleventyConfig.logger.forceLog(
        `Serverless (${this.name}): ${req.url} (${Date.now() - start}ms)`
      );

      // eleventy-dev-server 1.0.0-canary.10 and newer
      if ("_shouldForceEnd" in res) {
        res._shouldForceEnd = true;
        next();
      } else {
        // eleventy-dev-server 1.0.0-canary.9 and below
        res.end();
      }
    }.bind(this);
  }

  async ensureDir() {
    return fsp.mkdir(this.getOutputPath(""), {
      recursive: true,
    });
  }

  async writeServerlessFunctionFile() {
    let filepath = this.getOutputPath("index.js");
    if (!fs.existsSync(filepath)) {
      let defaultContentPath = TemplatePath.absolutePath(
        __dirname,
        "./DefaultServerlessFunctionContent.js"
      );

      let contents = await fsp.readFile(defaultContentPath, "utf8");
      contents = contents.replace(/\%\%NAME\%\%/g, this.name);
      contents = contents.replace(/\%\%FUNCTIONS_DIR\%\%/g, this.options.functionsDir);
      return fsp.writeFile(filepath, contents);
    }
  }
}

function EleventyPlugin(eleventyConfig, options = {}) {
  options = Object.assign(
    {
      name: "",
      functionsDir: "./functions/",
      copy: [],

      // https://www.npmjs.com/package/recursive-copy#usage
      copyOptions: {},

      // Dependencies explicitly declared from configuration and global data can be excluded and hidden from bundler.
      // Excluded from: `eleventy-app-config-modules.js` and `eleventy-app-globaldata-modules.js`
      excludeDependencies: [],

      // Add automated redirects (appends or creates, avoids duplicate entries)
      // Also accepts a custom callback function(name, outputMap)
      redirects: "netlify-toml",

      // Useful for local develop to disable all bundle copying
      copyEnabled: true,
    },
    options
  );

  if (!options.name) {
    throw new Error("Serverless addPlugin second argument options object must have a name.");
  }

  if (process.env.ELEVENTY_SOURCE === "cli") {
    let helper = new BundlerHelper(options.name, options, eleventyConfig);

    eleventyConfig.setServerOptions({
      middleware: [helper.serverMiddleware()],
    });

    eleventyConfig.on("eleventy.before", async () => {
      helper.reset();
      await helper.ensureDir();
      await helper.writeServerlessFunctionFile();
      helper.writeDependencyEntryFile();
    });

    eleventyConfig.on("eleventy.after", async () => {
      if (!options.copyEnabled) {
        return;
      }

      // extra copy targets
      // we put these in after a build so that we can grab files generated _by_ the build too
      if (options.copy && Array.isArray(options.copy)) {
        let promises = [];
        for (let cp of options.copy) {
          if (typeof cp === "string") {
            promises.push(helper.recursiveCopy(cp));
          } else if (cp.from && cp.to) {
            promises.push(helper.recursiveCopy(cp.from, cp.to, cp.options));
          } else {
            debug("Ignored extra copy %o (needs to be a string or a {from: '', to: ''})", cp);
          }
        }
        await Promise.all(promises);
      }

      eleventyConfig.logger.log(
        `Serverless: ${helper.copyCount} file${
          helper.copyCount !== 1 ? "s" : ""
        } bundled to ${helper.getOutputPath("")}.`
      );
    });

    eleventyConfig.on("eleventy.env", async (env) => {
      await helper.ensureDir();

      if (!options.copyEnabled) {
        return;
      }

      await helper.recursiveCopy(env.config, "eleventy.config.js");
      await helper.processJavaScriptFiles([env.config], "eleventy-app-config-modules.js");
    });

    eleventyConfig.on("eleventy.globalDataFiles", async (fileList) => {
      if (!options.copyEnabled) {
        return;
      }
      // Note that originals are copied in `eleventy.directories` event below
      await helper.processJavaScriptFiles(fileList, "eleventy-app-globaldata-modules.js");
    });

    // directory data files only
    eleventyConfig.on("eleventy.dataFiles", async (fileList) => {
      if (!options.copyEnabled) {
        return;
      }

      await helper.copyFileList(fileList);
      await helper.processJavaScriptFiles(fileList, "eleventy-app-dirdata-modules.js");
    });

    eleventyConfig.on("eleventy.directories", async (dirs) => {
      let promises = [];
      if (options.copyEnabled) {
        promises.push(helper.recursiveCopy(dirs.input));

        if (!DirContains(dirs.input, dirs.data)) {
          promises.push(helper.recursiveCopy(dirs.data));
        }
        if (!DirContains(dirs.input, dirs.includes)) {
          promises.push(helper.recursiveCopy(dirs.includes));
        }
        if (dirs.layouts && !DirContains(dirs.input, dirs.layouts)) {
          // TODO avoid copy if dirs.layouts is in dirs.input
          promises.push(helper.recursiveCopy(dirs.layouts));
        }
      }

      let filename = helper.getOutputPath("eleventy-serverless.json");
      promises.push(
        fsp.writeFile(
          filename,
          JSON.stringify(
            {
              dir: dirs,
            },
            null,
            2
          )
        )
      );
      debug(`Eleventy Serverless (${options.name}), writing ${filename}`);
      this.copyCount++;

      await Promise.all(promises);
    });

    eleventyConfig.on("eleventy.serverlessUrlMap", (templateMap) => {
      let outputMap = {};

      for (let entry of templateMap) {
        for (let key in entry.serverless) {
          if (key !== options.name) {
            continue;
          }
          let urls = entry.serverless[key];
          if (!Array.isArray(urls)) {
            urls = [entry.serverless[key]];
          }
          for (let eligibleUrl of urls) {
            // ignore duplicates that have the same input file, via Pagination.
            if (outputMap[eligibleUrl] === entry.inputPath) {
              continue;
            }

            // duplicates that don’t use the same input file, throw an error.
            if (outputMap[eligibleUrl]) {
              throw new Error(
                `Serverless URL conflict: multiple input files are using the same URL path (in \`permalink\`): ${outputMap[eligibleUrl]} and ${entry.inputPath}`
              );
            }

            outputMap[eligibleUrl] = entry.inputPath;
          }
        }
      }

      // Maps input files to output paths
      let mapEntryCount = Object.keys(outputMap).length;
      // This is expected to exist even if empty
      let filename = helper.getOutputPath("eleventy-serverless-map.json");
      fs.writeFileSync(filename, JSON.stringify(outputMap, null, 2));
      debug(`Eleventy Serverless (${options.name}), writing (×${mapEntryCount}): ${filename}`);
      this.copyCount++;

      // Write redirects (even if no redirects exist for this function to handle deletes)
      if (options.copyEnabled && options.redirects) {
        if (typeof options.redirects === "string" && redirectHandlers[options.redirects]) {
          redirectHandlers[options.redirects](options.name, outputMap);
        } else if (typeof options.redirects === "function") {
          options.redirects(options.name, outputMap);
        }
      }
    });
  }
}

module.exports = EleventyPlugin;
