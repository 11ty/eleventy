import test from "ava";

import { ResolveConfigurationData } from "../src/Data/ResolveConfigurationData.js";

test("Alternate location", (t) => {
  t.is(ResolveConfigurationData.getAlternatePropertyName("permalink"), undefined);
  t.is(ResolveConfigurationData.getAlternatePropertyName("eleventyComputed"), undefined);
  t.is(ResolveConfigurationData.getAlternatePropertyName("buildawesome.computed"), "eleventyComputed");
  t.is(ResolveConfigurationData.getAlternatePropertyName("buildawesome.dataSchema"), "eleventyDataSchema");
  t.is(ResolveConfigurationData.getAlternatePropertyName("buildawesome.excludeFromCollections"), "eleventyExcludeFromCollections");
});

test("Permalink (empty data)", (t) => {
	let data = {};
	t.is(ResolveConfigurationData.getValue(data, "permalink"), undefined);
});

test("Permalink", (t) => {
	let data = { permalink: "test" };
	t.is(ResolveConfigurationData.getValue(data, "permalink"), "test");
});

test("Computed Data", (t) => {
	let data = { eleventyComputed: { key: "value" } };
	t.deepEqual(ResolveConfigurationData.getValue(data, "eleventyComputed"), { key: "value" });
});

test("Computed Data, alternate location", (t) => {
	let data = { eleventyComputed: { key: "value1" } };
	t.deepEqual(ResolveConfigurationData.getValue(data, "buildawesome.computed"), { key: "value1" });
});

test("Both locations exist, prefer primary", (t) => {
	let data = {
		eleventyComputed: { key1: "value1" },
		buildawesome: {
			computed: { key2: "value2" },
		},
	};

	t.deepEqual(ResolveConfigurationData.getValue(data, "buildawesome.computed"), { key2: "value2" });
});

test("Both locations exist, no alternate", (t) => {
	let data = {
		eleventyComputed: { key1: "value1" },
		buildawesome: {
			computed: { key2: "value2" },
		},
	};

	t.deepEqual(ResolveConfigurationData.getValue(data, "eleventyComputed"), { key1: "value1" });
});
