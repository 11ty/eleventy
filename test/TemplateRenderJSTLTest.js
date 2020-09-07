const test = require("ava");
const TemplateRender = require("../src/TemplateRender");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");

function getNewTemplateRender(name, inputDir) {
  let tr = new TemplateRender(name, inputDir);
  tr.extensionMap = new EleventyExtensionMap();
  return tr;
}

// ES6
test("ES6 Template Literal", (t) => {
  t.is(getNewTemplateRender("jstl").getEngineName(), "jstl");
});

test("ES6 Template Literal Render (Backticks)", async (t) => {
  // pass in a string here, we don’t want to compile the template in the test :O
  let fn = await getNewTemplateRender("jstl").getCompiledTemplate(
    "`<p>${name.toUpperCase()}</p>`"
  );
  t.is(await fn({ name: "Tim" }), "<p>TIM</p>");
});

test("ES6 Template Literal Render (No backticks)", async (t) => {
  // pass in a string here, we don’t want to compile the template in the test :O
  let fn = await getNewTemplateRender("jstl").getCompiledTemplate(
    "<p>${name.toUpperCase()}</p>"
  );
  t.is(await fn({ name: "Tim" }), "<p>TIM</p>");
});

test("ES6 Template Literal with newlines", async (t) => {
  // pass in a string here, we don’t want to compile the template in the test :O
  let fn = await getNewTemplateRender("jstl").getCompiledTemplate(
    "Test\n\nMarkdown Syntax ${name}\n"
  );
  t.is(await fn({ name: "Tim" }), "Test\n\nMarkdown Syntax Tim\n");
});

test("ES6 Template Literal with markdown", async (t) => {
  // pass in a string here, we don’t want to compile the template in the test :O
  let fn = await getNewTemplateRender("jstl").getCompiledTemplate(
    "Test\n```\nMarkdown Syntax ${name}\n```"
  );

  // TODO this has an extra newline at the end because the input string ends in a `!
  t.is(await fn({ name: "Tim" }), "Test\n```\nMarkdown Syntax Tim\n```\n");
});
