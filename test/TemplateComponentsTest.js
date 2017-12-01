import test from "ava";
import TemplateComponents from "../src/TemplateComponents";

import pkg from "../package.json";

test(async t => {
	let componentsObj = new TemplateComponents( "./test/stubs/_components" );
	let components = await componentsObj.getComponents({_package: pkg});

	t.is( "testComponent" in components, true );
});
