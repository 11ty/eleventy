import TemplateContentPrematureUseError from "./TemplateContentPrematureUseError.js";

/* Hack to workaround the variety of error handling schemes in template languages */
class EleventyErrorUtil {
	static get prefix() {
		return ">>>>>11ty>>>>>";
	}
	static get suffix() {
		return "<<<<<11ty<<<<<";
	}

	static hasEmbeddedError(msg) {
		if (!msg) {
			return false;
		}

		return msg.includes(EleventyErrorUtil.prefix) && msg.includes(EleventyErrorUtil.suffix);
	}

	static cleanMessage(msg) {
		if (!msg) {
			return "";
		}

		if (!EleventyErrorUtil.hasEmbeddedError(msg)) {
			return "" + msg;
		}

		return msg.slice(0, Math.max(0, msg.indexOf(EleventyErrorUtil.prefix)));
	}

	static deconvertErrorToObject(error) {
		if (!error || !error.message) {
			throw new Error(`Could not convert error object from: ${error}`);
		}
		if (!EleventyErrorUtil.hasEmbeddedError(error.message)) {
			return error;
		}

		let msg = error.message;
		let objectString = msg.substring(
			msg.indexOf(EleventyErrorUtil.prefix) + EleventyErrorUtil.prefix.length,
			msg.lastIndexOf(EleventyErrorUtil.suffix),
		);
		let obj = JSON.parse(objectString);
		obj.name = error.name;
		return obj;
	}

	// pass an error through a random template engine’s error handling unscathed
	static convertErrorToString(error) {
		return (
			EleventyErrorUtil.prefix +
			JSON.stringify({ message: error.message, stack: error.stack }) +
			EleventyErrorUtil.suffix
		);
	}

	static isPrematureTemplateContentError(e) {
		// TODO the rest of the template engines
		return (
			e instanceof TemplateContentPrematureUseError ||
			(e.originalError &&
				(e.originalError.name === "RenderError" ||
					e.originalError.name === "UndefinedVariableError") &&
				e.originalError.originalError instanceof TemplateContentPrematureUseError) || // Liquid
			(e.message || "").indexOf("TemplateContentPrematureUseError") > -1
		); // Nunjucks
	}
}

export default EleventyErrorUtil;
