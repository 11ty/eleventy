import fs from "fs-extra";
import test from "ava";
import globby from "globby";

import TemplateWriter from "../src/TemplateWriter";

import cfg from "../config.json";


test("Mutually exclusive Input and Output dirs", t => {
	let tw = new TemplateWriter("./test/stubs/writeTest", "./test/stubs/_writeTestSite", ["ejs", "md"]);
	let files = globby.sync(tw.files);
	t.is( tw.rawFiles.length, 2 );
	t.true( files.length > 0 );
	t.is( files[0], "./test/stubs/writeTest/test.md" );
});

// TODO make sure if output is a subdir of input dir that they don’t conflict.
test("Output is a subdir of input", async t => {

	let tw = new TemplateWriter("./test/stubs/writeTest", "./test/stubs/writeTest/_writeTestSite", ["ejs", "md"]);
	let files = globby.sync(tw.files);
	t.is( tw.rawFiles.length, 2 );
	t.true( files.length > 0 );

	let tmpl = tw._getTemplate( files[0] );
	t.is( tmpl.inputDir, "./test/stubs/writeTest" );
	t.is( tmpl.outputPath, "./test/stubs/writeTest/_writeTestSite/test.html" );

	// don’t write because this messes with ava’s watch
	// fs.removeSync( "./test/stubs/writeTest/_site" );
	// await tw.write();
	// t.true( fs.existsSync( "./test/stubs/writeTest/_site/test.html" ) );
});
