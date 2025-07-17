import { defineConfig } from "vitest/config";
import os from "node:os";

let instances = [{ browser: "chromium" }, { browser: "firefox" }];

if (os.type() === "Darwin") {
	instances.push({ browser: "webkit" });
}

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			headless: true,
			screenshotFailures: false,
			provider: "playwright",
			// https://vitest.dev/guide/browser/playwright
			instances,
		},
	},
});
