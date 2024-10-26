import test from "ava";
import getCollectionItemIndex from "../src/Filters/GetCollectionItemIndex.js";

test("getCollectionItemIndex", (t) => {
  let first = {
    inputPath: "hello.md",
    outputPath: "/hello/",
  };
  let second = {
    inputPath: "hello2.md",
    outputPath: "/hello2/",
  };
  let third = {
    inputPath: "hello3.md",
    outputPath: "/hello3/",
  };
  let collections = [first, second, third];

  t.deepEqual(getCollectionItemIndex(collections, first), 0);
  t.deepEqual(getCollectionItemIndex(collections, second), 1);
  t.deepEqual(getCollectionItemIndex(collections, third), 2);

  t.deepEqual(
    getCollectionItemIndex(collections, {
      inputPath: "unknown.md",
      outputPath: "/unknown/",
    }),
    undefined
  );
});
