import test from "ava";
import { DepGraph as DependencyGraph } from "dependency-graph";

test("Dependency graph nodes don’t require dependencies", async (t) => {
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
  t.deepEqual(graph.overallOrder(), ["all", "template-a", "template-b", "template-c"]);
});

test("Dependency graph assumptions", async (t) => {
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

test("Do dependencies get removed when nodes are deleted?", async (t) => {
  let graph = new DependencyGraph();

  graph.addNode("template-a");
  graph.addNode("template-b");
  graph.addDependency("template-a", "template-b");
  t.deepEqual(graph.overallOrder(), ["template-b", "template-a"]);

  t.deepEqual(graph.dependenciesOf("template-a"), ["template-b"]);

  graph.removeNode("template-b");
  t.deepEqual(graph.dependenciesOf("template-a"), []);

  graph.addNode("template-b");
  t.deepEqual(graph.dependenciesOf("template-a"), []);

  t.deepEqual(graph.overallOrder(), ["template-a", "template-b"]);
});
