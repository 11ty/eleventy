import test from "ava";
import TemplateData from "../src/TemplateData";
import Template from "../src/Template";
import pretty from "pretty";
import normalize from "normalize-path";

function cleanHtml(str) {
	return pretty(str, {ocd: true});
}

test("stripLeadingDotSlash", t => {
	let tmpl = new Template("./test/stubs/template.ejs", "./test/stubs/", "./dist");
	t.is( tmpl.stripLeadingDotSlash("./test/stubs"), "test/stubs" );
	t.is( tmpl.stripLeadingDotSlash("./dist"), "dist" );
	t.is( tmpl.stripLeadingDotSlash("../dist"), "../dist" );
	t.is( tmpl.stripLeadingDotSlash("dist"), "dist" );
});

test("getTemplateSubFolder", t => {
	let tmpl = new Template("./test/stubs/template.ejs", "./test/stubs/", "./dist");
	t.is(tmpl.getTemplateSubfolder(), "");
});

test("getTemplateSubFolder, output is a subdir of input", t => {
	let tmpl = new Template("./test/stubs/template.ejs", "./test/stubs/", "./test/stubs/_site");
	t.is(tmpl.getTemplateSubfolder(), "");
});

test("output path maps to an html file", t => {
	let tmpl = new Template("./test/stubs/template.ejs", "./test/stubs/", "./dist");
	t.is(tmpl.parsed.dir, "./test/stubs");
	t.is(tmpl.inputDir, "./test/stubs");
	t.is(tmpl.outputDir, "./dist");
	t.is(tmpl.getTemplateSubfolder(), "");
	t.is(tmpl.getOutputPath(), "./dist/template.html");
});

test("subfolder outputs to a subfolder", t => {
	let tmpl = new Template("./test/stubs/subfolder/subfolder.ejs", "./test/stubs/", "./dist");
	t.is(tmpl.parsed.dir, "./test/stubs/subfolder");
	t.is(tmpl.getTemplateSubfolder(), "subfolder");
	t.is(tmpl.getOutputPath(), "./dist/subfolder/subfolder.html");
});

test("ignored files start with an underscore", t => {
	let tmpl = new Template("./test/stubs/_ignored.ejs", "./test/stubs/", "./dist");
	t.is(tmpl.isIgnored(), true);
});

test("HTML files output to the same as the input directory have a file suffix added.", async t => {
	let tmpl = new Template("./test/stubs/testing.html", "./test/stubs", "./test/stubs");
	t.is(tmpl.getOutputPath(), "./test/stubs/testing-output.html");
});

test("Test raw front matter from template", t => {
	let tmpl = new Template("./test/stubs/templateFrontMatter.ejs", "./test/stubs/", "./dist");
	t.truthy( tmpl.inputContent, "template exists and can be opened." );
	t.is( tmpl.frontMatter.data.key1, "value1" );
});

test("Test that getData() works", async t => {
	let tmpl = new Template("./test/stubs/templateFrontMatter.ejs", "./test/stubs/", "./dist");
	let data = await tmpl.getData();

	t.is( data.key1, "value1" );
	t.is( data.key3, "value3" );

	let mergedFrontMatter = tmpl.getAllLayoutFrontMatterData(tmpl, tmpl.getFrontMatterData());

	t.is( mergedFrontMatter.key1, "value1" );
	t.is( mergedFrontMatter.key3, "value3" );
});

test("More advanced getData()", async t => {
	let dataObj = new TemplateData( "./test/stubs/globalData.json" );
	let tmpl = new Template("./test/stubs/templateFrontMatter.ejs", "./test/stubs/", "dist", dataObj);
	let data = await tmpl.getData({
		key1: "value1override",
		key2: "value2"
	});

	t.is( data._package.name, "elevenisland" );
	t.is( data.key1, "value1override", "local data argument overrides front matter" );
	t.is( data.key2, "value2", "local data argument, no front matter" );
	t.is( data.key3, "value3", "front matter only" );
});

test( "One Layout", async t => {
	let dataObj = new TemplateData( "./test/stubs/globalData.json" );
	let tmpl = new Template("./test/stubs/templateWithLayout.ejs", "./test/stubs/", "dist", dataObj);

	t.is(tmpl.frontMatter.data.layout, "defaultLayout");
	
	let data = await tmpl.getData();
	t.is( data.layout, "defaultLayout" );

	t.is( cleanHtml( await tmpl.renderLayout(tmpl, data) ), `<div id="layout">
  <p>Hello.</p>
</div>` );

	let mergedFrontMatter = tmpl.getAllLayoutFrontMatterData(tmpl, tmpl.getFrontMatterData());

	t.is( mergedFrontMatter.keymain, "valuemain" );
	t.is( mergedFrontMatter.keylayout, "valuelayout" );
});

test( "Two Layouts", async t => {
	let dataObj = new TemplateData( "./test/stubs/globalData.json" );
	let tmpl = new Template("./test/stubs/templateTwoLayouts.ejs", "./test/stubs/", "dist", dataObj);

	t.is(tmpl.frontMatter.data.layout, "layout-a");
	
	let data = await tmpl.getData();
	t.is( data.layout, "layout-a" );
	t.is( data.key1, "value1" );

	t.is( cleanHtml( await tmpl.renderLayout(tmpl, data) ), `<div id="layout-b">
  <div id="layout-a">
    <p>value2-a</p>
  </div>
</div>` );

	let mergedFrontMatter = tmpl.getAllLayoutFrontMatterData(tmpl, tmpl.getFrontMatterData());

	t.is( mergedFrontMatter.daysPosted, 152 );
});

test( "Liquid template", async t => {
	let dataObj = new TemplateData( "./test/stubs/globalData.json" );
	let tmpl = new Template("./test/stubs/formatTest.liquid", "./test/stubs/", "dist", dataObj);

	t.is( await tmpl.render(), `<p>Zach</p>` );
});

test( "Liquid template with include", async t => {
	let tmpl = new Template("./test/stubs/includer.liquid", "./test/stubs/", "dist");

	t.is( await tmpl.render(), `<p>This is an include.</p>` );
});