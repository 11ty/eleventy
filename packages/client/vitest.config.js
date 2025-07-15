import { defineConfig } from "vitest/config";
import os from "node:os";

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			headless: true,
			screenshotFailures: false,
			provider: "playwright",
			// https://vitest.dev/guide/browser/playwright
			instances: [
				{ browser: "chromium" },
				{ browser: "firefox" },
				os.type() === "Darwin" ? { browser: "webkit" } : {},
			],
		},
	},
});
