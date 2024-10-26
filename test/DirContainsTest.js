import test from "ava";
import DirContains from "../src/Util/DirContains.js";

test("Compare to current dir", (t) => {
  t.true(DirContains(".", "."));
  t.false(DirContains(".", ".."));
  t.true(DirContains(".", "test"));
  t.true(DirContains(".", "./test"));
  t.false(DirContains(".", "../test"));
});

test("Compare to parent dir", (t) => {
  t.true(DirContains("..", "."));
  t.true(DirContains("..", ".."));
  t.false(DirContains("..", "../.."));
  t.true(DirContains("..", "test"));
  t.true(DirContains("..", "./test"));
  t.true(DirContains("..", "../test"));
});

test("Compare to subfolder", (t) => {
  t.false(DirContains("test", "."));
  t.false(DirContains("test", ".."));
  t.false(DirContains("test", "../.."));
  t.true(DirContains("test", "test"));
  t.true(DirContains("test", "./test"));
  t.false(DirContains("test", "../test"));
});

test("Compare to subfolder dot slash", (t) => {
  t.false(DirContains("./test", "."));
  t.false(DirContains("./test", ".."));
  t.false(DirContains("./test", "../.."));
  t.true(DirContains("./test", "test"));
  t.true(DirContains("./test", "./test"));
  t.false(DirContains("./test", "../test"));
});

test("Compare to sibling folder", (t) => {
  t.false(DirContains("../test", "."));
  t.false(DirContains("../test", ".."));
  t.false(DirContains("../test", "../.."));
  t.false(DirContains("../test", "test"));
  t.false(DirContains("../test", "./test"));
  t.true(DirContains("../test", "../test"));
  t.true(DirContains("../test", "../test/sub1"));
});
