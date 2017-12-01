import test from "ava";
import TemplateComponents from "../src/TemplateComponents";
import TemplateData from "../src/TemplateData";
import Template from "../src/Template";
import pretty from "pretty";

function cleanHtml(str) {
	return pretty(str, {ocd: true});
}

test(t => {
	let tmpl = new Template("./test/stubs/template.ejs", "dist");
	t.is(tmpl.cleanOutputDir(), "test/stubs");
});

test("output path maps to an html file", t => {
	let tmpl = new Template("./test/stubs/template.ejs", "dist");
	t.is(tmpl.getOutputPath(), "dist/test/stubs/template.html");
});

test("subfolder outputs to a subfolder", t => {
	let tmpl = new Template("./test/stubs/subfolder/subfolder.ejs", "dist");
	t.is(tmpl.getOutputPath(), "dist/test/stubs/subfolder/subfolder.html");
});

test("ignored files start with an underscore", t => {
	let tmpl = new Template("./test/stubs/_ignored.ejs", "dist");
	t.is(tmpl.isIgnored(), true);
});

test("cleanLayoutDir", t => {
	let tmpl = new Template("./test/stubs/_ignored.ejs", "dist");
	t.is(tmpl.cleanLayoutDir("./test/stubs"), "./test/stubs/_layouts");
	t.is(tmpl.cleanLayoutDir("./test/stubs/_components"), "./test/stubs/_layouts");
	t.is(tmpl.cleanLayoutDir("./test/stubs/_components/_layouts"), "./test/stubs/_layouts");
	t.is(tmpl.cleanLayoutDir("./test/stubs/_layouts"), "./test/stubs/_layouts");
	t.is(tmpl.cleanLayoutDir("./test/stubs/_layouts/_layouts"), "./test/stubs/_layouts");
});

test("Test raw front matter from template", t => {
	let tmpl = new Template("./test/stubs/templateFrontMatter.ejs", "dist");
	t.truthy( tmpl.inputContent, "template exists and can be opened." );
	t.is( tmpl.frontMatter.data.key1, "value1" );
});

test("Test that getData() works", async t => {
	let tmpl = new Template("./test/stubs/templateFrontMatter.ejs", "dist");
	let data = await tmpl.getData();

	t.is( data.key1, "value1" );
	t.is( data.key3, "value3" );

	let mergedFrontMatter = tmpl.getAllLayoutFrontMatterData(tmpl, tmpl.getFrontMatterData());

	t.is( mergedFrontMatter.key1, "value1" );
	t.is( mergedFrontMatter.key3, "value3" );
});

test("More advanced getData()", async t => {
	let componentsObj = new TemplateComponents( "./test/stubs/_components" );
	let dataObj = new TemplateData( "./test/stubs/globalData.json", componentsObj );
	let tmpl = new Template("./test/stubs/templateFrontMatter.ejs", "dist", dataObj);
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
	let tmpl = new Template("./test/stubs/templateWithLayout.ejs", "dist", dataObj);

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
	let tmpl = new Template("./test/stubs/templateTwoLayouts.ejs", "dist", dataObj);

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
	let tmpl = new Template("./test/stubs/formatTest.liquid", "dist", dataObj);

	t.is( await tmpl.render(), `<p>Zach</p>` );
});