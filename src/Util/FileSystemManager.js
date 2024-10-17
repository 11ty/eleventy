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

	get cache() {
		return this.eleventyConfig.existsCache;
	}

	async createDirectoryForFile(filePath) {
		let dir = path.parse(filePath).dir;
		if (!dir || this.cache.exists(dir)) {
			return;
		}

		return mkdir(dir, { recursive: true }).then((result) => {
			this.cache.markExistsWithParentDirectories(dir);
			return result;
		});
	}

	createDirectoryForFileSync(filePath) {
		let dir = path.parse(filePath).dir;
		if (!dir || this.cache.exists(dir)) {
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
