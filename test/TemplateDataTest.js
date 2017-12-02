import test from "ava";
import TemplateData from "../src/TemplateData";
import TemplateComponents from "../src/TemplateComponents";

test("create without components", async t => {
	let dataObj = new TemplateData( "./test/stubs/globalData.json" );
	let data = await dataObj.getData();

	t.true( Object.keys( data._package ).length > 0 );
	t.true( Object.keys( data._components ).length === 0 );
});

test("getData()", async t => {
	let componentsObj = new TemplateComponents( "./test/stubs" );
	let dataObj = new TemplateData( "./test/stubs/globalData.json", componentsObj );

	t.is( dataObj.getData().toString(), "[object Promise]" );

	let globalData = await dataObj.getData();
	t.is( globalData.datakey1, "datavalue1", "simple data value" );
	t.is( globalData.datakey2, "elevenisland", "variables, resolve _package to its value." );

	t.true( Object.keys( globalData._package ).length > 0, "package.json imported to data in _package" );
	t.true( Object.keys( globalData._components ).length > 0, "components templates imported to data in _components" );

	// note: component use not supported in globalData.json
	t.is( globalData._components.testComponent({str: "Test"}), "c:Test" );
	t.is( globalData._components.testComponentPkg(), "c:elevenisland" );
});

test("getJson()", async t => {
	let componentsObj = new TemplateComponents( "./test/stubs" );
	let dataObj = new TemplateData( "./test/stubs/globalData.json", componentsObj );

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
