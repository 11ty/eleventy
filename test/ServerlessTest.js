const test = require("ava");
const EleventyServerless = require("../src/Serverless");

test("Test a one-template markdown render.", async (t) => {
  let elev = new EleventyServerless("test1", {
    path: "/",
    query: {},
    inputDir: "./test/serverless-stubs/",
    functionsDir: "./test/serverless-stubs/functions/",
  });

  t.is((await elev.render()).trim(), "<h1>Hi</h1>");
});

test("Test a transform on serverless output.", async (t) => {
  let elev = new EleventyServerless("test1", {
    path: "/",
    query: {},
    inputDir: "./test/serverless-stubs-config/",
    functionsDir: "./test/serverless-stubs-config/functions/",
  });

  t.is((await elev.render()).trim(), "<h1>Hi</h1><p>Hi</p>");
});

test("Test page.url on serverless output.", async (t) => {
  let elev = new EleventyServerless("test1", {
    path: "/sample/",
    query: {},
    inputDir: "./test/serverless-stubs-page-url/",
    functionsDir: "./test/serverless-stubs-page-url/functions/",
  });

  t.is((await elev.render()).trim(), "<h1>/sample/</h1>");
});
