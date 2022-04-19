import { RenderManager } from "../src/Plugins/RenderPlugin.js";

// This is the code that runs on the Edge
export class EleventyEdge {
  constructor(name, options = {}) {
    this.startTiming = new Date();

    this.name = name;
    if (!options.request) {
      throw new Error(
        "Missing `request` property in options object on EleventyEdge constructor."
      );
    }

    this.request = options.request;
    delete options.request;

    this.context = options.context;
    delete options.context;

    this.renderManager = new RenderManager();

    this.url = new URL(this.request.url);

    this.options = Object.assign(
      {
        // which cookies to include in render data
        cookies: [],
      },
      options
    );

    this.buildTimeData = {};

    // Only one of these is valid
    if (EleventyEdgePrecompiled) {
      this.setPrecompiled(EleventyEdgePrecompiled);
    }
    if (options.precompiled) {
      this.setPrecompiled(options.precompiled || {});
    }

    delete options.precompiled;
  }

  setPrecompiled({ eleventy, nunjucksPrecompiled, buildTimeData }) {
    // TODO don’t throw errors—instead if the version check fails just swap to {% comment %} instead
    if (eleventy && eleventy.compatibility) {
      this.renderManager.config((eleventyConfig) => {
        eleventyConfig.versionCheck(eleventy.compatibility);
      });
    }

    if (nunjucksPrecompiled) {
      this.renderManager.config((eleventyConfig) => {
        eleventyConfig.setNunjucksPrecompiledTemplates(nunjucksPrecompiled);
      });
    }

    if (buildTimeData) {
      this.buildTimeData = buildTimeData;
    }
  }

  async getResponse() {
    if (this.response) {
      await this.response;
    } else {
      this.response = await this.context.next();
    }
    return this.response;
  }

  getHeaders(content) {
    let { key } = this.getContentType();
    let headers = {
      "content-type": `${key}; charset=UTF-8`,
      "server-timing": `tmpl;dur=${Date.now() - this.startTiming}`,
    };

    // Content-Length is added by the platform

    return headers;
  }

  getContentType() {
    let contentType = this.response.headers.get("content-type");
    let types = {
      "text/html": {
        key: "text/html",
        comments: ["<!--", "-->"],
      },

      // Unlock Edge rendered CSS or JS here:

      // "text/css": {
      //   key: "text/css",
      //   comments: ["/*", "*/"]
      // },
      // "text/javascript": {
      //   key: "text/javascript",
      //   comments: ["/*", "*/"]
      // },
    };

    for (let type in types) {
      if (contentType.startsWith(type)) {
        return types[type];
      }
    }
  }

  // `x-eleventy-edge-mode: skip` header allows granual opt-out of Eleventy Edge
  continue() {
    if (this.response.status !== 200) {
      return false;
    }
    if (this.response.headers.get("x-eleventy-edge-mode") === "skip") {
      return false;
    }

    // console.log( this.request.url, this.getContentType() );
    if (this.getContentType()) {
      return true;
    }
    return false;
  }

  augmentContent(content) {
    let contentTypeObj = this.getContentType();
    if (!contentTypeObj) {
      return content;
    }

    let [startComment, endComment] = contentTypeObj.comments;
    // Special HTML escape for compat with markdown preprocessors
    // The trailing space after ELEVENTYEDGE_name is important!
    // Think mismatches on ELEVENTYEDGE_edge vs. ELEVENTYEDGE_edge2
    content = content.replaceAll(
      `${startComment}ELEVENTYEDGE_${this.name} `,
      "{% endraw %}{% renderTemplate "
    );
    content = content.replaceAll(
      `ELEVENTYEDGE_${this.name}${endComment}`,
      "{% endrenderTemplate %}{% raw %}"
    );

    // Note also that the rest of the content is passed through {% raw %} to allow use of overlapping raw syntax in parent template
    return `{% raw %}${content}{% endraw %}`;
  }

  async getTemplateContent() {
    let raw = await this.response.text();
    return this.augmentContent(raw);
  }

  config(fn) {
    this.renderManager.config(fn);
  }

  async getEdgeData() {
    // https://github.com/netlify-labs/plugin-edge-handlers-test#the-context-object
    // context.cookies
    // request.headers

    // Warning, handling of duplicate keys is non-standard. Here they are de-duped
    let query = Object.fromEntries(this.url.searchParams);

    let cookies = {};
    if (this.options.cookies === "*") {
      // getAll is not yet supported on CookieStore here, we *could* implement this ourselves using raw cookie header value
      // cookies = Object.fromEntries(this.context.cookies.getAll());
    } else if (Array.isArray(this.options.cookies)) {
      for (let name of this.options.cookies) {
        cookies[name] = this.context.cookies.get(name);
      }
    }

    let edge = {
      method: this.request.method.toLowerCase(),
      path: this.url.pathname,
      query,
      cookies,
      // ua: this.request.headers.get("user-agent"),
      referer: this.request.headers.get("referer"),
      saveData: this.request.headers.get("save-data") === "on",
      // geo: context.geo,
    };

    // if(this.request.headers.get("content-type") === "application/x-www-form-urlencoded") {
    //   let postFormData = await this.request.clone().formData();
    //   edge.postData = Object.fromEntries(postFormData);
    // }

    return {
      eleventy: {
        env: {
          source: "edge",
        },
        edge,
      },
    };
  }

  async render(data) {
    let content = await this.getTemplateContent();

    // TODO support data from configuration API `addGlobalData` calls

    // We always use liquid as the page level language, since it only controls the
    // top level `renderTemplate` shortcodes and not the content inside of them
    let fn = await this.renderManager.compile(content, "liquid");

    let edgeData = await this.getEdgeData();
    let merged = Object.assign({}, data, this.buildTimeData, edgeData);
    let rendered = await fn(merged);
    return rendered;
  }

  async handleResponse() {
    let response = await this.getResponse();

    if (!this.continue()) {
      return response;
    }

    let content = await this.render();

    return new Response(content, {
      headers: {
        ...this.getHeaders(content),
      },
    });
  }
}
