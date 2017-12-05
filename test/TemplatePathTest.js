import test from "ava";
import path from "path";
import TemplatePath from "../src/TemplatePath";

test("Working dir", t => {
	t.is(TemplatePath.getWorkingDir(), path.resolve("./"));
	t.is(TemplatePath.getModuleDir(), path.resolve( __dirname, ".." ));
});

test("Normalizer", async t => {
	t.is( TemplatePath.normalize("testing", "hello"), "testing/hello" );
	t.is( TemplatePath.normalize("testing", "hello/"), "testing/hello" );
	t.is( TemplatePath.normalize("./testing", "hello"), "testing/hello" );
	t.is( TemplatePath.normalize("./testing", "hello/"), "testing/hello" );
	t.is( TemplatePath.normalize("./testing/hello"), "testing/hello" );
	t.is( TemplatePath.normalize("./testing/hello/"), "testing/hello" );
});