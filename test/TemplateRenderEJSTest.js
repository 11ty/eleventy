import test from "ava";
import TemplateRender from "../src/TemplateRender";
import EleventyExtensionMap from "../src/EleventyExtensionMap";
import UserConfig from "../src/UserConfig";

function getNewTemplateRender(name, inputDir) {
  let tr = new TemplateRender(name, inputDir);
  tr.extensionMap = new EleventyExtensionMap();
  return tr;
}

// EJS
test("EJS", (t) => {
  t.is(getNewTemplateRender("ejs").getEngineName(), "ejs");
  t.is(
    getNewTemplateRender("./test/stubs/filename.ejs").getEngineName(),
    "ejs"
  );
});

test("EJS Render", async (t) => {
  let fn = await getNewTemplateRender("ejs").getCompiledTemplate(
    "<p><%= name %></p>"
  );
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("EJS Render Absolute Include, Preprocessor Directive", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate("<p><% include /included %></p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Absolute Include, Fxn no Data", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate("<p><%- include('/included') %></p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Absolute Include, Fxn with Data", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate(
    "<p><%- include('/includedvar', { name: 'Bill' }) %></p>"
  );
  t.is(await fn(), "<p>This is an Bill.</p>");
});

test("EJS Render Relative Include (no leading dot-slash for current dir), Preprocessor Directive", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/relative-ejs/dir/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate("<p><% include included %></p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Relative Include Current dir to Subdir, Preprocessor Directive", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/relative-ejs/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate("<p><% include ./dir/included %></p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Relative Include Parent dir to Subdir, Preprocessor Directive", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/relative-ejs/dir/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate("<p><% include ../dir/included %></p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Relative Include, Fxn no Data", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate("<p><%- include('_includes/included', {}) %></p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Relative Include current dir to subdir, Fxn no Data", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/relative-ejs/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate("<p><%- include('./dir/included', {}) %></p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("EJS Render Relative Include, Fxn with Data", async (t) => {
  // includes require a full filename passed in
  let fn = await getNewTemplateRender(
    "./test/stubs/filename.ejs",
    "./test/stubs/"
  ).getCompiledTemplate(
    "<p><%- include('_includes/includedvar', { name: 'Bill' }) %></p>"
  );
  t.is(await fn(), "<p>This is an Bill.</p>");
});

test("EJS Render: with Library Override", async (t) => {
  let tr = getNewTemplateRender("ejs");

  let lib = require("ejs");
  tr.engine.setLibrary(lib);

  let fn = await tr.getCompiledTemplate("<p><%= name %></p>");
  t.is(await fn({ name: "Zach" }), "<p>Zach</p>");
});

test("EJS Custom Function", async (t) => {
  let tr = getNewTemplateRender("ejs");
  let userConfig = new UserConfig();
  userConfig.addShortcode("greetPrudenceTheCat", function (str) {
    // Data in context
    t.is(this.page.url, "/hi/");
    t.not(this.name, "Prudence The Cat");

    return str + " Prudence The Cat";
  });

  // Adding the the custom function to the ejs functions
  Object.assign(tr.config.ejsFunctions, userConfig.ejsFunctions);

  t.is(
    await tr._testRender("<%- greetPrudenceTheCat(greet) %>", {
      greet: "Hallo",
      page: {
        url: "/hi/",
      },
    }),
    "Hallo Prudence The Cat"
  );
});

test("EJS Async Custom Function", async (t) => {
  let tr = getNewTemplateRender("ejs");
  let userConfig = new UserConfig();
  userConfig.addShortcode("greetPrudenceTheCatAsync", async function (str) {
    // Data in context
    t.is(this.page.url, "/hi/");
    t.not(this.name, "Prudence The Cat");

    return str + " Prudence The Cat";
  });

  // Adding the the custom function to the ejs functions
  Object.assign(tr.config.ejsFunctions, userConfig.ejsFunctions);
  // Setting the async option of EJS to true to enable async in templates
  Object.assign(tr.config.ejsOptions, { async: true });

  t.is(
    await tr._testRender("<%- await greetPrudenceTheCatAsync(greet) %>", {
      greet: "Hallo",
      page: {
        url: "/hi/",
      },
    }),
    "Hallo Prudence The Cat"
  );
});
