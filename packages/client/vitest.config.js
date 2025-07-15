import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			headless: true,
			screenshotFailures: false,
			provider: "playwright",
			// https://vitest.dev/guide/browser/playwright
			instances: [{ browser: "chromium" }, { browser: "firefox" }, { browser: "webkit" }],
		},
	},
});
