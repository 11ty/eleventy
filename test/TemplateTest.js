import test from "ava";
import Template from "../src/Template";

test(t => {
	let tmpl = new Template("./test/stubs/template.ejs", {}, "dist");
	t.is(tmpl.cleanOutputDir(), "test/stubs");
});

test(t => {
	let tmpl = new Template("./test/stubs/template.ejs", {}, "dist");
	t.is(tmpl.getOutputPath(), "dist/test/stubs/template.html");
});

test(t => {
	let tmpl = new Template("./test/stubs/subfolder/subfolder.ejs", {}, "dist");
	t.is(tmpl.getOutputPath(), "dist/test/stubs/subfolder/subfolder.html");
});

test(t => {
	let tmpl = new Template("./test/stubs/_ignored.ejs", {}, "dist");
	t.is(tmpl.isIgnored(), true);
});
