import test from "ava";
import path from "path";
import deleteRequireCache from "../src/Util/DeleteRequireCache";
import template from "./stubs/function.11ty";

test("deleteRequireCache", t => {
  const modulePath = path.normalize(
    path.join(__dirname, "./stubs/function.11ty.js")
  );
  const posixModulePath = useForwardSlashes(modulePath);
  const windowsModulePath = useBackwardSlashes(modulePath);

  // Prepare a Windows like require cache
  require.cache[windowsModulePath] =
    require.cache[posixModulePath] || require.cache[windowsModulePath];
  delete require.cache[posixModulePath];

  deleteRequireCache(posixModulePath);

  t.is(require.cache[posixModulePath], undefined);
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
