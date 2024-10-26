class FilePathUtil {
	static isMatchingExtension(filepath, fileExtension) {
		if (!fileExtension) {
			return false;
		}

		if (!(fileExtension || "").startsWith(".")) {
			fileExtension = "." + fileExtension;
		}

		return filepath.endsWith(fileExtension);
	}

	static getFileExtension(filepath) {
		return (filepath || "").split(".").pop();
	}
}

export { FilePathUtil };
