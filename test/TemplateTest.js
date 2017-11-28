import test from "ava";
import Template from "../src/Template";

test(t => {
	let tmpl = new Template("./test/stubs/template.ejs", {});
	t.is(tmpl.cleanDir(), "test/stubs");
});

test(t => {
	let tmpl = new Template("./test/stubs/template.ejs", {});
	t.is(tmpl.getOutputPath(), "dist/test/stubs/template.html");
});

test(t => {
	let tmpl = new Template("./test/stubs/subfolder/subfolder.ejs", {});
	t.is(tmpl.getOutputPath(), "dist/test/stubs/subfolder/subfolder.html");
});
