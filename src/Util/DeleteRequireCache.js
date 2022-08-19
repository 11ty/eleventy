import { normalize } from "node:path";
import { TemplatePath } from "@11ty/eleventy-utils";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

/**
 * Removes a nodejs module from the cache.
 * The keys of the nodejs require cache are file paths based on the current operating system.
 * @param {string} absolutePath An absolute POSIX path to the file.
 */
export function deleteRequireCacheAbsolute(absolutePath) {
  const normalizedPath = normalize(absolutePath);
  delete require.cache[normalizedPath];
}

export default function deleteRequireCache(localPath) {
  let absolutePath = TemplatePath.absolutePath(localPath);
  deleteRequireCacheAbsolute(absolutePath);
}
