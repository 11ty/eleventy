import test from "ava";
import IncrementalManager from "../src/IncrementalManager";

// test("Setup", t => {
//   let inc = new IncrementalManager();
//   t.is(inc.buildFileName, ".eleventybuildinfo");
//   t.true(inc.buildFilePath.endsWith(".eleventybuildinfo"));
//   t.deepEqual(inc.getBuildFileInfo(), new Map());
// });

// test("Cache gets", t => {
//   let inc = new IncrementalManager();
//   inc.add("testFile.md", "testFile/index.html", "THIS IS MY CONTENT");

//   let cached = inc.cache.get(inc.getCacheKey("testFile.md", "testFile/index.html"));
//   t.truthy(cached);
//   t.is(inc.cache.size, 1);

//   inc.add("testFile.md", "testFile/index.html", "THIS IS MY CONTENT");
//   t.is(inc.cache.size, 1);
// });

// test("Build File content", async t => {
//   let inc = new IncrementalManager();
//   inc.add("testFile.md", "testFile/index.html", "THIS IS MY CONTENT");

//   let buildInfo = await inc.getBuildFileContent();
//   t.is(buildInfo, `[${JSON.stringify({
//     inputFile: "testFile.md",
//     outputPath: "testFile/index.html",
//     content: inc.getHashedContent("THIS IS MY CONTENT")
//   })}]`);
// });

// test("Should write file", async t => {
//   let inc = new IncrementalManager();
//   inc.add("testFile.md", "testFile/index.html", "THIS IS MY CONTENT");

//   t.is(inc.shouldWriteFile("testFile.md", "testFile/index.html", "THIS IS MY CONTENTd"), true);
//   t.is(inc.shouldWriteFile("testFile.md", "testFile/index.html", "THIS IS MY CONTENT"), false);
// });
