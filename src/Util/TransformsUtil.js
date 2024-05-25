import EleventyBaseError from "../Errors/EleventyBaseError.js";
import { isPlainObject } from "@11ty/eleventy-utils";

class EleventyTransformError extends EleventyBaseError {}

class TransformsUtil {
	static changeTransformsToArray(transformsObj) {
		let transforms = [];
		for (let name in transformsObj) {
			transforms.push({
				name: name,
				callback: transformsObj[name],
			});
		}
		return transforms;
	}

	static overrideOutputPath(outputPath, outputPathFileExtensionOverride) {
		if (!outputPathFileExtensionOverride || typeof outputPathFileExtensionOverride !== "string") {
			return outputPath;
		}

		// if the override already has an `.` but not a leading `.`, treat the override as file path
		if (outputPathFileExtensionOverride.includes(".")) {
			if (!outputPathFileExtensionOverride.startsWith(".")) {
				return outputPathFileExtensionOverride;
			}

			outputPathFileExtensionOverride = outputPathFileExtensionOverride.slice(1);
		}

		// if the override does not already have an `.`, treat the override as a new extension
		let splits = (outputPath || "").split(".");
		splits.pop();
		return splits.join(".") + `.${outputPathFileExtensionOverride}`;
	}

	static async runAll(content, pageData, transforms = {}, outputPathFileExtensionOverride = false) {
		let { inputPath, outputPath, url } = pageData;

		if (!isPlainObject(transforms)) {
			throw new Error("Object of transforms expected as third parameter.");
		}

		let transformsArray = this.changeTransformsToArray(transforms);
		let outputPathOverride = this.overrideOutputPath(outputPath, outputPathFileExtensionOverride);
		let pageDataOverride = Object.assign({}, pageData, {
			outputPath: outputPathOverride,
		});

		for (let { callback, name } of transformsArray) {
			try {
				let hadContentBefore = !!content;

				content = await callback.call(
					{
						inputPath,
						outputPath: outputPathOverride,
						url,
						page: pageDataOverride,
					},
					content,
					outputPath,
				);

				if (hadContentBefore && !content) {
					this.logger.warn(
						`Warning: Transform \`${name}\` returned empty when writing ${outputPath} from ${inputPath}.`,
					);
				}
			} catch (e) {
				throw new EleventyTransformError(
					`Transform \`${name}\` encountered an error when transforming ${inputPath}.`,
					e,
				);
			}
		}

		return content;
	}
}

export default TransformsUtil;
