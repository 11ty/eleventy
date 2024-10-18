import path from "node:path";
import fs from "node:fs";

import gracefulFs from "graceful-fs";
import util from "node:util";

const mkdir = util.promisify(gracefulFs.mkdir);
const writeFile = util.promisify(gracefulFs.writeFile);

class FileSystemManager {
	constructor(eleventyConfig) {
		this.eleventyConfig = eleventyConfig;
	}

	exists(pathname) {
		return this.eleventyConfig.existsCache.exists(pathname);
	}

	async createDirectoryForFile(filePath) {
		let dir = path.parse(filePath).dir;
		if (!dir || this.exists(dir)) {
			return;
		}

		return mkdir(dir, { recursive: true });
	}

	createDirectoryForFileSync(filePath) {
		let dir = path.parse(filePath).dir;
		if (!dir || this.exists(dir)) {
			return;
		}

		fs.mkdirSync(dir, { recursive: true });
	}

	async writeFile(filePath, content) {
		return writeFile(filePath, content);
	}

	writeFileSync(filePath, content) {
		// Note: This deliberately uses the synchronous version to avoid
		// unbounded concurrency: https://github.com/11ty/eleventy/issues/3271
		fs.writeFileSync(filePath, content);
	}
}

export { FileSystemManager };
