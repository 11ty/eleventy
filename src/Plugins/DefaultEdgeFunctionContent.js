import { EleventyEdge } from "eleventy:edge";
import precompiled from "./_generated/precompiled.js";

export default async (request, context) => {
  try {
    let edge = new EleventyEdge("%%EDGE_NAME%%", {
      request,
      context,
      precompiled,

      // default is [], add more keys to opt-in e.g. ["appearance", "username"]
      cookies: [],
    });

    edge.config((eleventyConfig) => {
      // Add some custom Edge-specific configuration
      // e.g. Fancier json output
      // eleventyConfig.addFilter("json", obj => JSON.stringify(obj, null, 2));
    });

    return await edge.handleResponse();
  } catch (e) {
    console.log("ERROR", { e });
    return context.next(e);
  }
};
