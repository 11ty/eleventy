import test from "ava";
import JavaScriptDependencies from "../src/Util/JavaScriptDependencies.js";

test("No node_modules", async (t) => {
  let deps = await JavaScriptDependencies.getDependencies([
    "./test/stubs-dependency-tree/index.cjs",
  ]);

  t.deepEqual(deps, [
    "./test/stubs-dependency-tree/child.cjs",
    "./test/stubs-dependency-tree/grandchild.cjs",
  ]);
});
