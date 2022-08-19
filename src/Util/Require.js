import { TemplatePath } from "@11ty/eleventy-utils";
import deleteRequireCacheAbsolute from "./DeleteRequireCache.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

function requireLocal(localPath) {
  let absolutePath = TemplatePath.absolutePath(localPath);

  if (localPath.endsWith(".cjs") || !localPath.endsWith(".js"))
    return requireAbsolute(absolutePath);
  else return import(localPath);
}

function requireAbsolute(absolutePath) {
  // remove from require cache so it will grab a fresh copy
  deleteRequireCacheAbsolute(absolutePath);

  return require(absolutePath);
}

export { requireLocal as EleventyRequire };
export { requireAbsolute as EleventyRequireAbsolute };
