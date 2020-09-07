const test = require("ava");

test("Dependency graph nodes don’t require dependencies", async (t) => {
  const DependencyGraph = require("dependency-graph").DepGraph;
  let graph = new DependencyGraph();

  graph.addNode("all");
  graph.addNode("template-a");
  graph.addNode("template-b");
  graph.addNode("template-c");

  t.not(graph.overallOrder().indexOf("all"), -1);
  t.not(graph.overallOrder().indexOf("template-a"), -1);
  t.not(graph.overallOrder().indexOf("template-b"), -1);
  t.not(graph.overallOrder().indexOf("template-c"), -1);

  // in order of addition
  t.deepEqual(graph.overallOrder(), [
    "all",
    "template-a",
    "template-b",
    "template-c",
  ]);
});

test("Dependency graph assumptions", async (t) => {
  const DependencyGraph = require("dependency-graph").DepGraph;
  let graph = new DependencyGraph();

  graph.addNode("all");
  graph.addNode("template-a");
  graph.addNode("template-b");
  graph.addNode("template-c");
  graph.addNode("userCollection");
  graph.addDependency("all", "template-a");
  graph.addDependency("all", "template-b");
  graph.addDependency("all", "template-c");
  graph.addDependency("userCollection", "all");
  t.deepEqual(graph.overallOrder(), [
    "template-a",
    "template-b",
    "template-c",
    "all",
    "userCollection",
  ]);
});
