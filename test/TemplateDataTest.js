import test from "ava";
import TemplateData from "../src/TemplateData";

test("Create", async t => {
	let dataObj = new TemplateData( "./test/stubs/globalData.json" );
	let data = await dataObj.getData();

	t.true( Object.keys( data._package ).length > 0 );
});

test("getData()", async t => {
	let dataObj = new TemplateData( "./test/stubs/globalData.json" );

	t.is( dataObj.getData().toString(), "[object Promise]" );

	let globalData = await dataObj.getData();
	t.is( globalData.datakey1, "datavalue1", "simple data value" );
	t.is( globalData.datakey2, "elevenisland", "variables, resolve _package to its value." );

	t.true( Object.keys( globalData._package ).length > 0, "package.json imported to data in _package" );
});

test("getJson()", async t => {
	let dataObj = new TemplateData( "./test/stubs/globalData.json" );

	let data = await dataObj.getJson(dataObj.globalDataPath, dataObj.rawImports)

	t.is( data.datakey1, "datavalue1" );
	t.is( data.datakey2, "elevenisland" );
});

test("getJson() file does not exist", async t => {
	let dataObj = new TemplateData( "./test/stubs/thisfiledoesnotexist.json" );

	let data = await dataObj.getJson(dataObj.globalDataPath, dataObj.rawImports)

	t.is( typeof data, "object" );
	t.is( Object.keys( data ).length, 0 );
});
