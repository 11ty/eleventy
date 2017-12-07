import test from "ava";
import TemplateConfig from "../src/TemplateConfig";

test("Template Config local config overrides base config", async t => {
	let templateCfg = new TemplateConfig(require("../config.json"), "./test/stubs/config.js" );
	let cfg = templateCfg.getConfig();

	t.is( cfg.markdownTemplateEngine, "ejs" );
});