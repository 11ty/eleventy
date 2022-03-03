const path = require("path");
const fs = require("fs");
const finalhandler = require("finalhandler");
const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const TemplatePath = require("./TemplatePath");
const ConsoleLogger = require("./Util/ConsoleLogger");
const debug = require("debug")("EleventyServeAdapter");

const MAX_PORT_ASSIGNMENT_RETRIES = 10;
const serverCache = {};

class EleventyServeAdapter {
  static getServer(name, config) {
    if (!serverCache[name]) {
      serverCache[name] = new EleventyServeAdapter(name, config);
    }

    return serverCache[name];
  }

  static normalizePathPrefix(pathPrefix) {
    if (pathPrefix) {
      // add leading / (for browsersync), see #1454
      // path.join uses \\ for Windows so we split and rejoin
      return EleventyServeAdapter.joinUrlParts("/", pathPrefix);
    }

    return "/";
  }

  static joinUrlParts(...parts) {
    return path
      .join(...parts)
      .split(path.sep)
      .join("/");
  }

  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.logger = new ConsoleLogger(true);
  }

  get config() {
    if (!this._config) {
      throw new EleventyServeConfigError(
        "You need to set the config property on EleventyServeAdapter."
      );
    }

    return this._config;
  }

  set config(config) {
    this._config = config;
  }

  getOutputDirFilePath(filepath, filename = "") {
    let computedPath = path.join(this.config.dir.output, filepath, filename);

    // Check that the file is in the output path (error if folks try use `..` in the filepath)
    let absComputedPath = TemplatePath.absolutePath(computedPath);
    let absOutputDir = TemplatePath.absolutePath(computedPath);
    if (!absComputedPath.startsWith(absOutputDir)) {
      throw new Error("Invalid path");
    }

    return computedPath;
  }

  isOutputFilePathExists(rawPath) {
    return fs.existsSync(rawPath) && !TemplatePath.isDirectorySync(rawPath);
  }

  /* Use conventions documented here https://www.zachleat.com/web/trailing-slash/
   * resource.html exists:
   *    /resource matches
   *    /resource/ redirects to /resource
   * resource/index.html exists:
   *    /resource redirects to /resource/
   *    /resource/ matches
   * both resource.html and resource/index.html exists:
   *    /resource matches /resource.html
   *    /resource/ matches /resource/index.html
   */
  mapUrlToFilePath(url) {
    let u = new URL(url, "http://localhost/"); // this localhost is not used
    url = u.pathname;

    let pathPrefix = EleventyServeAdapter.normalizePathPrefix(
      this.config.pathPrefix
    );
    if (pathPrefix !== "/") {
      if (!url.startsWith(pathPrefix)) {
        return {
          statusCode: 404,
        };
      }

      url = url.substr(pathPrefix.length);
    }

    let rawPath = this.getOutputDirFilePath(url);
    if (this.isOutputFilePathExists(rawPath)) {
      return {
        statusCode: 200,
        filepath: rawPath,
      };
    }

    let indexHtmlPath = this.getOutputDirFilePath(url, "index.html");
    let indexHtmlExists = fs.existsSync(indexHtmlPath);

    let htmlPath = this.getOutputDirFilePath(url, ".html");
    let htmlExists = fs.existsSync(htmlPath);

    // /resource/ => /resource/index.html
    if (indexHtmlExists) {
      if (url.endsWith("/")) {
        return {
          statusCode: 200,
          filepath: indexHtmlPath,
        };
      }

      return {
        statusCode: 301,
        url: url + "/",
      };
    }

    // /resource => resource.html
    if (htmlExists) {
      if (!url.endsWith("/")) {
        return {
          statusCode: 200,
          filepath: htmlPath,
        };
      }

      return {
        statusCode: 301,
        url: url + "/",
      };
    }

    return {
      statusCode: 404,
    };
  }

  get notifierClientContents() {
    if (!this._notifierClientContents) {
      let filepath = TemplatePath.absolutePath(
        __dirname,
        "Util/Reloader/reload-client.js"
      );
      this._notifierClientContents = fs.readFileSync(filepath, {
        encoding: "utf8",
      });
    }

    return this._notifierClientContents;
  }

  augmentContentWithNotifier(content, url) {
    let script = `<script type="module">${this.notifierClientContents}</script>`;

    // <title> is the only *required* element in an HTML document
    if (content.includes("</title>")) {
      return content.replace("</title>", `</title>${script}`);
    }

    // If you’ve reached this section, your HTML is invalid!
    // We want to be super forgiving here, because folks might be in-progress editing the document!
    if (content.includes("</head>")) {
      return content.replace("</head>", `${script}</head>`);
    }
    if (content.includes("</body>")) {
      return content.replace("</body>", `${script}</body>`);
    }
    if (content.includes("</html>")) {
      return content.replace("</html>", `${script}</html>`);
    }
    if (content.includes("<!doctype html>")) {
      return content.replace("<!doctype html>", `<!doctype html>${script}`);
    }

    // Notably, works without content at all!!
    return (content || "") + script;
  }

  get server() {
    if (this._server) {
      return this._server;
    }

    this._server = createServer((req, res) => {
      let next = finalhandler(req, res, {
        onerror: (e) => {
          if (e.statusCode === 404) {
            let localPath = TemplatePath.stripLeadingSubPath(
              e.path,
              TemplatePath.absolutePath(this.config.dir.output)
            );
            this.logger.error(
              `HTTP ${e.statusCode}: Template not found in output directory (${this.config.dir.output}): ${localPath}`
            );
          } else {
            this.logger.error(`HTTP ${e.statusCode}: ${e.message}`);
          }
        },
      });

      let textMimeTypes = {
        css: "css",
        js: "javascript",
      };

      // TODO add the reload notifier to error pages too!
      let match = this.mapUrlToFilePath(req.url);
      if (match) {
        if (match.statusCode === 200 && match.filepath) {
          let contents = fs.readFileSync(match.filepath, { encoding: "utf8" });
          if (match.filepath.endsWith(".html")) {
            res.setHeader("Content-Type", "text/html");
            res.end(this.augmentContentWithNotifier(contents, req.url));
          } else {
            let extension = match.filepath.split(".").pop();
            if (textMimeTypes[extension]) {
              res.setHeader("Content-Type", "text/" + textMimeTypes[extension]);
            }
            res.end(contents);
          }
        } else {
          // TODO add support for 404 pages (in different Jamstack server configurations)
          if (match.url) {
            res.writeHead(match.statusCode, {
              Location: match.url,
            });
            res.end();
          } else {
            next();
          }
        }
      } else {
        next();
      }
    });

    this.portRetryCount = 0;
    this._server.on("error", (err) => {
      if (err.code == "EADDRINUSE") {
        if (this.portRetryCount < MAX_PORT_ASSIGNMENT_RETRIES) {
          this.portRetryCount++;
          debug(
            "Server already using port %o, trying the next port %o. Retry number %o of %o",
            err.port,
            err.port + 1,
            this.portRetryCount,
            MAX_PORT_ASSIGNMENT_RETRIES
          );
          this.serverListen(err.port + 1);
        } else {
          throw new Error(
            `Tried ${MAX_PORT_ASSIGNMENT_RETRIES} different ports but they were all in use. You can a different starter port using --port on the command line.`
          );
        }
      } else {
        this.serverErrorHandler(err);
      }
    });

    this._server.on("listening", (e) => {
      this.setupReloadNotifier();
      let { port } = this._server.address();
      this.logger.message(
        `Server running at http://localhost:${port}/`,
        "log",
        "blue",
        true
      );
    });

    return this._server;
  }

  serverListen(port) {
    this.server.listen({
      port,
    });
  }

  init(options) {
    this.serverListen(options.port);
  }

  serverErrorHandler(err) {
    if (err.code == "EADDRINUSE") {
      this.logger.error(`Server error: Port in use ${err.port}`);
    } else {
      this.logger.error(`Server error: ${err.message}`);
    }
  }

  // Websocket Notifications
  setupReloadNotifier() {
    let updateServer = new WebSocketServer({
      server: this.server,
    });

    updateServer.on("connection", (ws) => {
      this.updateNotifier = ws;

      this.sendUpdateNotification({
        type: "eleventy.status",
        status: "connected",
      });
    });

    updateServer.on("error", (err) => {
      this.serverErrorHandler(err);
    });
  }

  sendUpdateNotification(obj) {
    if (this.updateNotifier) {
      this.updateNotifier.send(JSON.stringify(obj));
    }
  }

  exit() {
    this.sendUpdateNotification({
      type: "eleventy.status",
      status: "disconnected",
    });
  }

  mapReloadFilesToOutput(files) {
    return files
      .map((entry) => {
        let rawPath = this.getOutputDirFilePath(entry);
        if (this.isOutputFilePathExists(rawPath)) {
          return rawPath;
        }
        return false;
      })
      .filter((entry) => !!entry);
  }

  sendError({ error }) {
    this.sendUpdateNotification({
      type: "eleventy.error",
      // Thanks https://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
      error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
  }

  // TODO make this smarter, allow clients to subscribe to specific URLs and only send updates for those URLs
  async reload({ subtype, files, build }) {
    let pathprefix = EleventyServeAdapter.normalizePathPrefix(
      this.config.pathPrefix
    );
    if (build.templates) {
      build.templates = build.templates
        .filter((entry) => {
          // Filter to only include watched templates that were updated
          return (files || []).includes(entry.inputPath);
        })
        .map((entry) => {
          // Add pathPrefix to all template urls
          entry.url = EleventyServeAdapter.joinUrlParts(pathprefix, entry.url);
          return entry;
        });
    }

    this.sendUpdateNotification({
      type: "eleventy.reload",
      subtype,
      files,
      build,
      pathprefix,
    });
  }
}
module.exports = EleventyServeAdapter;
