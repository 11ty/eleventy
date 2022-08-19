import test from "ava";
import { createRequire } from "node:module";
import { normalize, join } from "node:path";
import { deleteRequireCacheAbsolute } from "../src/Util/DeleteRequireCache.js";
import template from "./stubs/function.11ty.js";

const require = createRequire(import.meta.url);
test("deleteRequireCache", (t) => {
  const modulePath = normalize(
    new URL("./stubs/function.11ty.js", import.meta.url).pathname
  );
  const posixModulePath = useForwardSlashes(modulePath);
  const windowsModulePath = useBackwardSlashes(modulePath);

  deleteRequireCacheAbsolute(posixModulePath);

  t.is(require.cache[windowsModulePath], undefined);
});

/**
 * @param {string} path
 * @returns {string}
 */
function useForwardSlashes(path) {
  return path.replace(/\\/g, "/");
}

/**
 * @param {string} path
 * @returns {string}
 */
function useBackwardSlashes(path) {
  return path.replace(/\//g, "\\");
}
