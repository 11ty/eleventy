import test from "ava";

import getCollectionItem from "../src/Filters/GetCollectionItem.js";

test("getCollectionItem", (t) => {
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

  t.deepEqual(getCollectionItem(collections, first), first);
  t.deepEqual(getCollectionItem(collections, second), second);
  t.deepEqual(getCollectionItem(collections, third), third);

  t.deepEqual(getCollectionItem(collections, first, -1), undefined);
  t.deepEqual(getCollectionItem(collections, second, -1), first);
  t.deepEqual(getCollectionItem(collections, third, -1), second);

  t.deepEqual(getCollectionItem(collections, first, 1), second);
  t.deepEqual(getCollectionItem(collections, second, 1), third);
  t.deepEqual(getCollectionItem(collections, third, 1), undefined);
});
