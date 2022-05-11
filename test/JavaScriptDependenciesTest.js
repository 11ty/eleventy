const test = require("ava");
const JavaScriptDependencies = require("../src/Util/JavaScriptDependencies.js");

test("No node_modules", (t) => {
  t.deepEqual(
    JavaScriptDependencies.getDependencies([
      "./test/stubs-dependency-tree/index.js",
    ]),
    [
      "./test/stubs-dependency-tree/child.js",
      "./test/stubs-dependency-tree/grandchild.js",
    ]
  );
});

test("Only node_modules", (t) => {
  t.deepEqual(
    JavaScriptDependencies.getDependencies(
      ["./test/stubs-dependency-tree/index.js"],
      true
    ),
    ["kleur", "lodash"]
  );
});
