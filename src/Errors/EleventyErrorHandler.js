import util from "node:util";
import debugUtil from "debug";

import ConsoleLogger from "../Util/ConsoleLogger.js";
import EleventyErrorUtil from "./EleventyErrorUtil.js";

const debug = debugUtil("Eleventy:EleventyErrorHandler");

class EleventyErrorHandler {
	constructor() {
		this._isVerbose = true;
	}

	get isVerbose() {
		return this._isVerbose;
	}

	set isVerbose(verbose) {
		this._isVerbose = !!verbose;
		this.logger.isVerbose = !!verbose;
	}

	get logger() {
		if (!this._logger) {
			this._logger = new ConsoleLogger();
			this._logger.isVerbose = this.isVerbose;
		}

		return this._logger;
	}

	set logger(logger) {
		this._logger = logger;
	}

	warn(e, msg) {
		if (msg) {
			this.initialMessage(msg, "warn", "yellow");
		}
		this.log(e, "warn");
	}

	fatal(e, msg) {
		this.error(e, msg);
		process.exitCode = 1;
	}

	once(type, e, msg) {
		if (e.__errorAlreadyLogged) {
			return;
		}

		this[type || "error"](e, msg);

		Object.defineProperty(e, "__errorAlreadyLogged", {
			value: true,
		});
	}

	error(e, msg) {
		if (msg) {
			this.initialMessage(msg, "error", "red", true);
		}
		this.log(e, "error", undefined, true);
	}

	static getTotalErrorCount(e) {
		let totalErrorCount = 0;
		let errorCountRef = e;
		while (errorCountRef) {
			totalErrorCount++;
			errorCountRef = errorCountRef.originalError;
		}
		return totalErrorCount;
	}

	//https://nodejs.org/api/process.html
	log(e, type = "log", chalkColor = "", forceToConsole = false) {
		if (process.env.DEBUG) {
			debug("Full error object: %o", util.inspect(e, { showHidden: false, depth: null }));
		}

		let showStack = true;
		if (e.skipOriginalStack) {
			showStack = false;
		}

		let totalErrorCount = EleventyErrorHandler.getTotalErrorCount(e);
		let ref = e;
		let index = 1;
		while (ref) {
			let nextRef = ref.originalError;

			// Nunjucks wraps errors and puts the original in error.cause
			if (nextRef?.cause?.originalError) {
				nextRef = nextRef.cause.originalError;
			}

			if (!nextRef && EleventyErrorUtil.hasEmbeddedError(ref.message)) {
				nextRef = EleventyErrorUtil.deconvertErrorToObject(ref);
			}

			if (nextRef?.skipOriginalStack) {
				showStack = false;
			}

			this.logger.message(
				`${totalErrorCount > 1 ? `${index}. ` : ""}${(
					EleventyErrorUtil.cleanMessage(ref.message) || "(No error message provided)"
				).trim()}${ref.name !== "Error" ? ` (via ${ref.name})` : ""}`,
				type,
				chalkColor,
				forceToConsole,
			);

			if (process.env.DEBUG) {
				debug(`(${type} stack): ${ref.stack}`);
			} else if (!nextRef) {
				// last error in the loop

				// remove duplicate error messages if the stack contains the original message output above
				let stackStr = ref.stack || "";
				if (e.removeDuplicateErrorStringFromOutput) {
					stackStr = stackStr.replace(
						`${ref.name}: ${ref.message}`,
						"(Repeated output has been truncated…)",
					);
				}

				if (showStack) {
					this.logger.message(
						"\nOriginal error stack trace: " + stackStr,
						type,
						chalkColor,
						forceToConsole,
					);
				}
			}
			ref = nextRef;
			index++;
		}
	}

	initialMessage(message, type = "log", chalkColor = "blue", forceToConsole = false) {
		if (message) {
			this.logger.message(message + ":", type, chalkColor, forceToConsole);
		}
	}
}

export { EleventyErrorHandler };
