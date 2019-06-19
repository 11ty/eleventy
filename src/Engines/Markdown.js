const markdownIt = require("markdown-it");
const TemplateEngine = require("./TemplateEngine");
const config = require("../Config");
// const debug = require("debug")("Eleventy:Markdown");

class Markdown extends TemplateEngine {
  constructor(name, includesDir) {
    super(name, includesDir);

    this.markdownOptions = {};

    this.setLibrary(this.config.libraryOverrides.md);
  }

  setLibrary(mdLib) {
    this.mdLib = mdLib || markdownIt(this.getMarkdownOptions());

    // Overrides a highlighter set in `markdownOptions`
    // This is separate so devs can pass in a new mdLib and still use the official eleventy plugin for markdown highlighting
    if (this.config.markdownHighlighter) {
      this.mdLib.set({
        highlight: this.config.markdownHighlighter
      });
    }

    this.setEngineLib(this.mdLib);
  }

  setMarkdownOptions(options) {
    this.markdownOptions = options;
  }

  getMarkdownOptions() {
    // work with "mode" presets https://github.com/markdown-it/markdown-it#init-with-presets-and-options
    if (typeof this.markdownOptions === "string") {
      return this.markdownOptions;
    }

    return Object.assign(
      {
        html: true
      },
      this.markdownOptions || {}
    );
  }

  async compile(str, inputPath, preTemplateEngine, bypassMarkdown) {
    let mdlib = this.mdLib;

    if (preTemplateEngine) {
      let fn;

      let engine;
      if (typeof preTemplateEngine === "string") {
        engine = TemplateEngine.getEngine(
          preTemplateEngine,
          super.getIncludesDir()
        );
      } else {
        engine = preTemplateEngine;
      }

      fn = await engine.compile(str, inputPath);

      if (bypassMarkdown) {
        return async function(data) {
          return fn(data);
        };
      } else {
        return async function(data) {
          let preTemplateEngineRender = await fn(data);
          let finishedRender = mdlib.render(preTemplateEngineRender);
          return finishedRender;
        };
      }
    } else {
      if (bypassMarkdown) {
        return function() {
          return str;
        };
      } else {
        return function() {
          // throw away data if preTemplateEngine is falsy
          return mdlib.render(str);
        };
      }
    }
  }
}

module.exports = Markdown;
