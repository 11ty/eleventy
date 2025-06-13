import path from "node:path";
import ProjectDirectories from "./ProjectDirectories.js";

class FileSystemRemap {
	constructor(paths = []) {
		this.paths = paths;
		this.cwd = FileSystemRemap.getCwd(paths);
	}

	getCwd() {
		return this.cwd;
	}

	getRemapped(paths) {
		return paths.map((entry) => FileSystemRemap.remapInput(entry, this.cwd));
	}

	getInput() {
		return this.getRemapped(this.paths);
	}

	getOutput(paths = []) {
		return paths.map((entry) => FileSystemRemap.remapOutput(entry, this.cwd));
	}

	static getParentDirPrefix(filePath = "") {
		let count = [];
		for (let p of filePath.split(path.sep)) {
			if (p === "..") {
				count.push("..");
			} else {
				break;
			}
		}

		if (count.length > 0) {
			// trailing slash
			return count.join(path.sep) + path.sep;
		}
		return "";
	}

	static getLongestParentDirPrefix(filePaths) {
		let longest = "";
		filePaths
			.map((entry) => {
				return this.getParentDirPrefix(entry);
			})
			.filter((entry) => Boolean(entry))
			.forEach((prefix) => {
				if (!longest || prefix.length > longest.length) {
					longest = prefix;
				}
			});
		return longest;
	}

	// alias
	static getCwd(filePaths) {
		return this.getLongestParentDirPrefix(filePaths);
	}

	static remapInput(entry, cwd) {
		if (cwd) {
			if (!entry.startsWith("**/") && !entry.startsWith(".git/**")) {
				return ProjectDirectories.getRelativeTo(entry, cwd);
			}
		}
		return entry;
	}

	static remapOutput(entry, cwd) {
		if (cwd) {
			return path.join(cwd, entry);
		}
		return entry;
	}
}

export default FileSystemRemap;
