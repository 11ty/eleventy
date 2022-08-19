import test from "ava";
import JavaScriptDependencies from "../src/Util/JavaScriptDependencies.js";
const { getDependencies } = JavaScriptDependencies;

test("No node_modules", async (t) => {
  t.deepEqual(
    await getDependencies(["./test/stubs-dependency-tree/index.js"]),
    [
      "./test/stubs-dependency-tree/child.js",
      "./test/stubs-dependency-tree/grandchild.js",
    ]
  );
});

test("Only node_modules", async (t) => {
  t.deepEqual(
    await getDependencies(["./test/stubs-dependency-tree/index.js"], true),
    ["kleur", "lodash"]
  );
});
