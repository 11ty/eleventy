import test from "ava";
import Layout from "../src/Layout";

test(t => {
	t.is( (new Layout( "default", "./test/stubs" )).findFileName(), "default.ejs" );
});

test(t => {
	// pick the first one if multiple exist.
	t.is( (new Layout( "multiple", "./test/stubs" )).findFileName(), "multiple.ejs" );
});
