import path from "node:path";
import fs from "node:fs";

class FileSystemManager {
	constructor(templateConfig) {
		if (!templateConfig || templateConfig.constructor.name !== "TemplateConfig") {
			throw new Error(
				"Internal error: Missing `templateConfig` or was not an instance of `TemplateConfig`.",
			);
		}
		this.templateConfig = templateConfig;
	}

	exists(pathname) {
		return this.templateConfig.existsCache.exists(pathname);
	}

	createDirectoryForFileSync(filePath) {
		let dir = path.parse(filePath).dir;
		if (!dir || this.exists(dir)) {
			return;
		}

		fs.mkdirSync(dir, { recursive: true });
	}

	writeFileSync(filePath, content) {
		// Note: This deliberately uses the synchronous version to avoid
		// unbounded concurrency: https://github.com/11ty/eleventy/issues/3271
		fs.writeFileSync(filePath, content);
	}
}

export { FileSystemManager };
