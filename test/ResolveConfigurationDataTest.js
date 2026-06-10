import test from "ava";

import { ResolveConfigurationData } from "../src/Data/ResolveConfigurationData.js";

test("Alternate location", (t) => {
  t.is(ResolveConfigurationData.getAlternatePropertyName("permalink"), undefined);
  t.is(ResolveConfigurationData.getAlternatePropertyName("eleventyComputed"), undefined);
  t.is(ResolveConfigurationData.getAlternatePropertyName("buildawesomeComputed"), "eleventyComputed");
  t.is(ResolveConfigurationData.getAlternatePropertyName("buildawesomeDataSchema"), "eleventyDataSchema");
  t.is(ResolveConfigurationData.getAlternatePropertyName("buildawesomeExcludeFromCollections"), "eleventyExcludeFromCollections");
});

test("Permalink (empty data)", (t) => {
	let data = {};
	t.is(ResolveConfigurationData.getValue(data, "permalink"), undefined);
	t.deepEqual(ResolveConfigurationData.resolve(data, "permalink"), { location: undefined });
});

test("Permalink", (t) => {
	let data = { permalink: "test" };
	t.is(ResolveConfigurationData.getValue(data, "permalink"), "test");
	t.deepEqual(ResolveConfigurationData.resolve(data, "permalink"), { location: "permalink", value: "test" });
});

test("Computed Data", (t) => {
	let data = { eleventyComputed: { key: "value" } };
	t.deepEqual(ResolveConfigurationData.getValue(data, "eleventyComputed"), { key: "value" });
	t.deepEqual(ResolveConfigurationData.resolve(data, "eleventyComputed"), {location: "eleventyComputed", value: { key: "value" }});
});

test("Computed Data, alternate location", (t) => {
	let data = { eleventyComputed: { key: "value1" } };
	t.deepEqual(ResolveConfigurationData.getValue(data, "buildawesomeComputed"), { key: "value1" });
	t.deepEqual(ResolveConfigurationData.resolve(data, "buildawesomeComputed"), { location: "eleventyComputed", value: { key: "value1" } });
});

test("Both locations exist, prefer primary", (t) => {
	let data = {
		eleventyComputed: { key1: "value1" },
		buildawesomeComputed: { key2: "value2" },
	};

	t.deepEqual(ResolveConfigurationData.getValue(data, "buildawesomeComputed"), { key2: "value2" });
	t.deepEqual(ResolveConfigurationData.resolve(data, "buildawesomeComputed"), { location: "buildawesomeComputed", value: { key2: "value2" } });
});

test("Both locations exist, no alternate", (t) => {
	let data = {
		eleventyComputed: { key1: "value1" },
		buildawesomeComputed: { key2: "value2" },
	};

	t.deepEqual(ResolveConfigurationData.getValue(data, "eleventyComputed"), { key1: "value1" });
	t.deepEqual(ResolveConfigurationData.resolve(data, "eleventyComputed"), { location: "eleventyComputed", value: { key1: "value1" } });
});
