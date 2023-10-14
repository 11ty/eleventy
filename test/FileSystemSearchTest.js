import test from "ava";
import FileSystemSearch from "../src/FileSystemSearch.js";

test("Base", async (t) => {
  let fs = new FileSystemSearch();
  t.is(fs.count, 0);

  t.deepEqual(await fs.search("key", "./test/file-system-search/*.txt"), [
    "./test/file-system-search/file.txt",
  ]);
  t.is(fs.count, 1);

  fs.add("./test/file-system-search/virtual-file.txt");
  t.deepEqual(await fs.search("key", "./test/file-system-search/*.txt"), [
    "./test/file-system-search/file.txt",
    "./test/file-system-search/virtual-file.txt",
  ]);
  t.is(fs.count, 1);

  fs.add("./test/file-system-search/another-file.txt");
  t.deepEqual(await fs.search("key", "./test/file-system-search/*.txt"), [
    "./test/file-system-search/file.txt",
    "./test/file-system-search/virtual-file.txt",
    "./test/file-system-search/another-file.txt",
  ]);
  t.is(fs.count, 1);

  // Delete
  fs.delete("./test/file-system-search/file.txt");
  t.deepEqual(await fs.search("key", "./test/file-system-search/*.txt"), [
    "./test/file-system-search/virtual-file.txt",
    "./test/file-system-search/another-file.txt",
  ]);
  t.is(fs.count, 1);

  fs.delete("./test/file-system-search/another-file.txt");
  t.deepEqual(await fs.search("key", "./test/file-system-search/*.txt"), [
    "./test/file-system-search/virtual-file.txt",
  ]);
  t.is(fs.count, 1);

  fs.delete("./test/file-system-search/virtual-file.txt");
  t.deepEqual(await fs.search("key", "./test/file-system-search/*.txt"), []);
  t.is(fs.count, 1);
});
