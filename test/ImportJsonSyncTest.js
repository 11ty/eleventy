import test from "ava";
import { TemplatePath } from "@11ty/eleventy-utils";
import { importJsonSync } from "../src/Util/ImportJsonSync.js";

test("Import a JSON", t => {
  t.deepEqual(Object.keys(importJsonSync("../../package.json")).sort().pop(), "version");
});

test("getWorkingProjectPackageJson() traverse parent dirs", t => {
  let filePath = TemplatePath.absolutePath("test", "package.json");
  t.deepEqual(Object.keys(importJsonSync(filePath, true)).sort().pop(), "version");
});
