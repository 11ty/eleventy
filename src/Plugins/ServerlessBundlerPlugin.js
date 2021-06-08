const fs = require("fs");
const path = require("path");
const TOML = require("@iarna/toml");
const copy = require("recursive-copy");
const dependencyTree = require("@11ty/dependency-tree");
const TemplatePath = require("../TemplatePath");
const debug = require("debug")("Eleventy:Serverless");

function getNodeModulesList(files) {
  let pkgs = new Set();

  let jsFiles = files.filter((entry) => entry.endsWith(".js"));

  for (let filepath of jsFiles) {
    let modules = dependencyTree(filepath, {
      nodeModuleNamesOnly: true,
      allowNotFound: true, // TODO is this okay?
    });

    for (let name of modules) {
      pkgs.add(name);
    }
  }

  return Array.from(pkgs).sort();
}

function addRedirectsWithoutDuplicates(config, redirects) {
  if (!config.redirects) {
    config.redirects = [];
  }

  for (let r of redirects) {
    let found = false;
    for (let entry of config.redirects) {
      if (r.from === entry.from && r.to === entry.to) {
        found = true;
      }
    }
    if (!found) {
      config.redirects.push(r);
    }
  }
  return config;
}

class BundlerHelper {
  constructor(name, options) {
    this.name = name;
    this.options = options;
    this.dir = path.join(options.functionsDir, name);
    this.copyCount = 0;
  }

  reset() {
    this.copyCount = 0;
  }

  getOutputPath(filepath) {
    return TemplatePath.addLeadingDotSlash(path.join(this.dir, filepath));
  }

  copyFile(fullPath, outputFilename) {
    debug(
      `Eleventy Serverless: Copying ${fullPath} to ${this.getOutputPath(
        outputFilename
      )}`
    );
    fs.copyFileSync(fullPath, this.getOutputPath(outputFilename));
    this.copyCount++;
  }

  recursiveCopy(src, dest) {
    let finalDest = this.getOutputPath(dest || src);
    return copy(src, finalDest, {
      overwrite: true,
      dot: true,
      junk: false,
      results: false,
    }).on(copy.events.COPY_FILE_COMPLETE, () => {
      this.copyCount++;
    });
  }

  writeBundlerDependenciesFile(filename, deps = []) {
    let modules = deps.map((name) => `require("${name}");`);
    if (modules.length) {
      let fullPath = this.getOutputPath(filename);
      fs.writeFileSync(fullPath, modules.join("\n"));
      debug(
        `Writing a file to make it very obvious to the serverless bundler which extra \`require\`s are needed from the config file (×${modules.length}): ${fullPath}`
      );
    }
  }

  writeDependencyEntryFile() {
    let modulesFilename = this.getOutputPath("eleventy-bundler-modules.js");
    if (!fs.existsSync(modulesFilename)) {
      this.writeBundlerDependenciesFile("eleventy-bundler-modules.js", [
        "./eleventy-app-config-modules.js",
        "./eleventy-app-globaldata-modules.js",
      ]);
    }
  }

  writeDependencyConfigFile(configPath) {
    let modules = getNodeModulesList([configPath]);
    this.writeBundlerDependenciesFile(
      "eleventy-app-config-modules.js",
      modules.filter(
        (name) => this.options.excludeDependencies.indexOf(name) === -1
      )
    );
  }

  writeDependencyGlobalDataFile(globalDataFileList) {
    let modules = getNodeModulesList(globalDataFileList);
    this.writeBundlerDependenciesFile(
      "eleventy-app-globalData-modules.js",
      modules.filter(
        (name) => this.options.excludeDependencies.indexOf(name) === -1
      )
    );
  }

  browserSyncMiddleware() {
    let serverlessFilepath = TemplatePath.addLeadingDotSlash(
      path.join(TemplatePath.getWorkingDir(), this.dir, "index")
    );

    return async (req, res, next) => {
      let serverlessFunction = require(serverlessFilepath);
      let url = new URL(req.url, "http://localhost/"); // any domain will do here, we just want the searchParams

      let start = new Date();
      let result = await serverlessFunction.handler({
        httpMethod: "GET",
        path: req.url,
        queryStringParameters: Object.fromEntries(url.searchParams),
      });

      if (result.statusCode === 404) {
        // return static file
        return next();
      }

      res.writeHead(result.statusCode, result.headers || {});
      res.write(result.body);
      res.end();

      console.log(`Dynamic Render: ${req.url} (${Date.now() - start}ms)`);
    };
  }
}

function EleventyPlugin(eleventyConfig, options = {}) {
  options = Object.assign(
    {
      name: "",
      functionsDir: "./functions/",
      copy: [],

      // Dependencies explicitly declared from configuration and global data can be excluded and hidden from bundler.
      // Excluded from: `eleventy-app-config-modules.js` and `eleventy-app-globalData-modules.js`
      excludeDependencies: [],

      // Add automated redirects to netlify.toml (appends or creates, avoids duplicate entries)
      redirects: function (outputMap) {
        let redirects = [];
        for (let url in outputMap) {
          redirects.push({
            from: url,
            to: `/.netlify/functions/${options.name}`,
            status: 200,
            force: true,
          });
        }

        let configFilename = "./netlify.toml";
        let cfg = {};
        // parse existing netlify.toml
        if (fs.existsSync(configFilename)) {
          cfg = TOML.parse(fs.readFileSync(configFilename));
        }
        let cfgWithRedirects = addRedirectsWithoutDuplicates(cfg, redirects);

        fs.writeFileSync(configFilename, TOML.stringify(cfgWithRedirects));
        debug(
          `Eleventy Serverless (${options.name}), writing (×${redirects.length}): ${configFilename}`
        );
      },
    },
    options
  );

  if (!options.name) {
    throw new Error(
      "Serverless addPlugin second argument options object must have a name."
    );
  }

  if (process.env.ELEVENTY_SOURCE === "cli") {
    let helper = new BundlerHelper(options.name, options);
    helper.writeDependencyEntryFile();

    eleventyConfig.setBrowserSyncConfig({
      middleware: [helper.browserSyncMiddleware()],
    });

    eleventyConfig.on("eleventy.before", async () => {
      helper.reset();
    });

    eleventyConfig.on("eleventy.after", async () => {
      // extra copy targets
      // we put these in after a build so that we can grab files generated _by_ the build too
      if (options.copy && Array.isArray(options.copy)) {
        let promises = [];
        for (let cp of options.copy) {
          if (typeof cp === "string") {
            promises.push(helper.recursiveCopy(cp));
          } else if (cp.from && cp.to) {
            promises.push(helper.recursiveCopy(cp.from, cp.to));
          } else {
            debug(
              "Ignored extra copy %o (needs to be a string or a {from: '', to: ''})",
              cp
            );
          }
        }
        await Promise.all(promises);
      }

      console.log(
        `Eleventy Serverless: ${
          helper.copyCount
        } files bundled to ${helper.getOutputPath("")}.`
      );
    });

    eleventyConfig.on("eleventy.env", (env) => {
      helper.copyFile(env.config, "eleventy.config.js");
      helper.writeDependencyConfigFile(env.config);
    });

    eleventyConfig.on("eleventy.globalDataFiles", (fileList) => {
      helper.writeDependencyGlobalDataFile(fileList);
    });

    eleventyConfig.on("eleventy.directories", async (dirs) => {
      let promises = [];
      promises.push(helper.recursiveCopy(dirs.data));
      promises.push(helper.recursiveCopy(dirs.includes));
      if (dirs.layouts) {
        promises.push(helper.recursiveCopy(dirs.layouts));
      }
      await Promise.all(promises);
    });

    eleventyConfig.on("eleventy.serverlessUrlMap", (templateMap) => {
      let outputMap = {};

      for (let entry of templateMap) {
        for (let key in entry.serverless) {
          if (key === options.name) {
            if (outputMap[entry.serverless[key]]) {
              throw new Error(
                `Serverless URL conflict: multiple input files are using the same URL path (in \`permalink\`): ${
                  outputMap[entry.serverless[key]]
                } and ${entry.inputPath}`
              );
            }

            outputMap[entry.serverless[key]] = entry.inputPath;
          }
        }
      }

      // Maps input files to output paths
      let mapEntryCount = Object.keys(outputMap).length;
      if (mapEntryCount > 0) {
        let filename = helper.getOutputPath("eleventy-serverless-map.json");
        fs.writeFileSync(filename, JSON.stringify(outputMap, null, 2));
        debug(
          `Eleventy Serverless (${options.name}), writing (×${mapEntryCount}): ${filename}`
        );
        this.copyCount++;

        // Write redirects into netlify.toml
        options.redirects(outputMap);

        // Copy templates to bundle folder
        for (let url in outputMap) {
          helper.recursiveCopy(outputMap[url]);
        }
      }
    });
  }
}

module.exports = EleventyPlugin;
