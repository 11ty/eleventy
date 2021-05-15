const fs = require("fs");
const fsp = fs.promises;
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
  }

  getOutputPath(filepath) {
    return TemplatePath.addLeadingDotSlash(path.join(this.dir, filepath));
  }

  copyFile(fullPath, outputFilename) {
    console.log(`Copying ${fullPath} to ${this.getOutputPath(outputFilename)}`);
    fs.copyFileSync(fullPath, this.getOutputPath(outputFilename));
  }

  recursiveCopy(src, dest) {
    let finalDest = this.getOutputPath(dest || src);

    return copy(src, finalDest, {
      overwrite: true,
      dot: true,
      junk: false,
      results: false,
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
      modules
    );
  }

  writeDependencyGlobalDataFile(globalDataFileList) {
    let modules = getNodeModulesList(globalDataFileList);
    this.writeBundlerDependenciesFile(
      "eleventy-app-globalData-modules.js",
      modules
    );
  }
}

module.exports = function (eleventyConfig, options = {}) {
  options = Object.assign(
    {
      name: "",
      functionsDir: "./functions/",
      copy: [],
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

        let newCfg = addRedirectsWithoutDuplicates(cfg, redirects);
        fs.writeFileSync(configFilename, TOML.stringify(newCfg));
        console.log(
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

  let dir = path.join(options.functionsDir, options.name);

  if (!process.env.ELEVENTY_SERVERLESS) {
    let helper = new BundlerHelper(options.name, options);
    helper.writeDependencyEntryFile();

    // extra copy targets
    (async function () {
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
    })();

    // TODO is this necessary or can we just use require("eleventy.config.js") in the `eleventy-bundler-modules.js` file
    eleventyConfig.on("eleventy.env", (env) => {
      helper.copyFile(env.config, "eleventy.config.js");
      helper.writeDependencyConfigFile(env.config);
    });

    eleventyConfig.on("eleventy.globalDataFiles", (fileList) => {
      helper.writeDependencyGlobalDataFile(fileList);
    });

    eleventyConfig.on("eleventy.directories", async (dirs) => {
      let promises = [];
      promises.push(copy(dirs.data, helper.getOutputPath(dirs.data)));
      promises.push(copy(dirs.includes, helper.getOutputPath(dirs.includes)));
      if (dirs.layouts) {
        promises.push(copy(dirs.layouts, helper.getOutputPath(dirs.layouts)));
      }
      await Promise.all(promises);
    });

    eleventyConfig.on("eleventy.dependencyMap", (templateMap) => {
      let outputMap = {};

      for (let entry of templateMap) {
        if (entry.isExternal) {
          outputMap[entry.url] = entry.inputPath;
        }
      }

      // Maps input files to output paths
      let mapEntryCount = Object.keys(outputMap).length;
      if (mapEntryCount > 0) {
        let filename = helper.getOutputPath("eleventy-serverless-map.json");
        fs.writeFileSync(filename, JSON.stringify(outputMap, null, 2));
        console.log(
          `Eleventy Serverless (${options.name}), writing (×${mapEntryCount}): ${filename}`
        );

        // Write redirects into netlify.toml
        options.redirects(outputMap);

        // Copy templates to bundle folder
        for (let url in outputMap) {
          helper.recursiveCopy(outputMap[url]);
        }
      }
    });
  }
};
