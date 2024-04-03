import test from "ava";
import ProjectDirectories from "../src/Util/ProjectDirectories.js";

test("Implied input", t => {
	let d = new ProjectDirectories();
	t.is(d.input, "./");
});

test("Input matches", t => {
	let d = new ProjectDirectories();
	d.setInput("./test/");
	t.is(d.input, "./test/");
});

test("Normalized input (has trailing slash)", t => {
	let d = new ProjectDirectories();
	d.setInput("test/");
	t.is(d.input, "./test/");
});

test("Normalized input (no trailing slash)", t => {
	let d = new ProjectDirectories();
	d.setInput("test");
	t.is(d.input, "./test/");
});

test("Input must exist", t => {
	let d = new ProjectDirectories();
	t.throws(() => d.setInput("does-not-exist"));
});

test("Input as file", t => {
	let d = new ProjectDirectories();
	d.setInput("test/stubs/index.html");
	t.is(d.input, "./test/stubs/");
});

test("Input as file (deep)", t => {
	let d = new ProjectDirectories();
	d.setInput("test/stubs/img/stub.md");
	t.is(d.input, "./test/stubs/img/");
});

test("Input as file (deep with inputDir)", t => {
	let d = new ProjectDirectories();
	d.setInput("test/stubs/img/stub.md", "test/stubs");
	t.is(d.input, "./test/stubs/");
});

test("Input as file (separate inputDir)", t => {
	let d = new ProjectDirectories();
	d.setInput("test/stubs/img/stub.md");
	d.setInputDir("test/stubs");
	t.is(d.input, "./test/stubs/");
});


test("Data directory, implied input and default data", t => {
	let d = new ProjectDirectories();
	t.is(d.data, "./_data/");
});

test("Data directory matches, explicit input", t => {
	let d = new ProjectDirectories();
	d.setInput("./test/");
	t.is(d.data, "./test/_data/");
});

test("Data directory matches, explicit input and data", t => {
	let d = new ProjectDirectories();
	d.setInput("./test/");
	d.setData("mydata");
	t.is(d.data, "./test/mydata/");
});

test("Data directory matches, explicit input and data (order reversed)", t => {
	let d = new ProjectDirectories();
	d.setData("mydata");
	d.setInput("./test/");
	t.is(d.data, "./test/mydata/");
});

test("Layouts/includes, implied", t => {
	let d = new ProjectDirectories();
	t.is(d.layouts, "./_layouts/");
	t.is(d.includes, "./_includes/");
});

test("Layouts/includes, explicit", t => {
	let d = new ProjectDirectories();
	d.setLayouts("layouts");
	d.setIncludes("includes");
	t.is(d.layouts, "./layouts/");
	t.is(d.includes, "./includes/");

	d.setInput("test");
	t.is(d.layouts, "./test/layouts/");
	t.is(d.includes, "./test/includes/");

	d.setLayouts("../layouts");
	d.setIncludes("../includes");
	t.is(d.layouts, "./layouts/");
	t.is(d.includes, "./includes/");
});

test("Output, implied", t => {
	let d = new ProjectDirectories();
	t.is(d.output, "./_site/");
});

test("Content/template/input paths", t => {
	let d = new ProjectDirectories();
	t.is(d.getInputPath("test.md"), "./test.md");
	t.is(d.getInputPath("./test.md"), "./test.md");

	d.setInput("test");
	t.is(d.getInputPath("test.md"), "./test/test.md");
	t.is(d.getInputPath("./test.md"), "./test/test.md");
});

test("Project file paths", t => {
	let d = new ProjectDirectories();
	t.is(d.getProjectPath("eleventy.config.js"), "./eleventy.config.js");
	t.is(d.getProjectPath("./eleventy.config.js"), "./eleventy.config.js");
});
