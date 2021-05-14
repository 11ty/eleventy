const path = require("path");
const fs = require("fs");

const Eleventy = require("./Eleventy");
const TemplatePath = require("./TemplatePath");
const UrlPattern = require("url-pattern");
const debug = require("debug")("Eleventy:Serverless");

class Serverless {
  constructor(name, event, options = {}) {
    this.name = name;
    this.event = event;

    this.options = Object.assign(
      {
        inputDir: "src",
        functionsDir: "functions/",
        mapFilename: "eleventy-serverless-map.json",
        // The bundle script sets the bundled config file name
        configFilename: "eleventy.config.js",
        matchUrlPattern: function (path, url) {
          let pattern = new UrlPattern(url);
          return pattern.match(path);
        },
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
    let fullPath = TemplatePath.absolutePath(
      this.dir,
      this.options.mapFilename
    );
    debug(
      `Including content map (maps output URLs to input files) from ${fullPath}`
    );
    return require(fullPath);
  }

  matchUrlPattern(contentMap) {
    for (let url in contentMap) {
      let result = this.options.matchUrlPattern(this.event.path, url);
      if (result) {
        return {
          pathParams: result,
          inputPath: contentMap[url],
        };
      }
    }

    throw new Error(
      `No matching URL found for ${this.event.path} in ${JSON.stringify(
        contentMap
      )}`
    );
  }

  async render(options = {}) {
    // TODO is this necessary?
    if (this.dir.startsWith("/var/task/")) {
      process.chdir(this.dir);
    }

    let inputDir = path.join(this.dir, this.options.inputDir);
    let configPath = path.join(this.dir, this.options.configFilename);
    let { pathParams, inputPath } = this.matchUrlPattern(this.getContentMap());

    debug(`Current dir: ${process.cwd()}`);
    debug(`Project dir: ${this.dir}`);
    debug(`Config path:  ${configPath}`);

    debug(`Input dir: ${inputDir}`);
    debug(`Requested URL:  ${this.event.path}`);
    debug(`Path params:  ${pathParams}`);
    debug(`Input path:  ${inputPath}`);

    let elev = new Eleventy(inputPath, null, {
      configPath,
      config: (eleventyConfig) => {
        if (options.precompiledCollections) {
          eleventyConfig.setPrecompiledCollections(
            options.precompiledCollections
          );
        }

        // Add the params to Global Data
        eleventyConfig.addGlobalData("eleventy.serverless", {
          query: this.event.queryStringParameters,
          path: pathParams,
        });
      },
    });

    elev.setInputDir(inputDir);
    await elev.init();

    let json = await elev.toJSON();
    if (!json.length) {
      throw new Error("Couldn’t find any generated output from Eleventy.");
    }

    debug(`Eleventy generated ${json.length} templates.`);

    for (let entry of json) {
      if (entry.inputPath === inputPath) {
        return entry.content;
      }
    }

    // Log to Serverless Function output
    console.log(json);
    throw new Error(
      `Couldn’t find any matching output from Eleventy for ${inputPath}`
    );
  }
}

module.exports = Serverless;
