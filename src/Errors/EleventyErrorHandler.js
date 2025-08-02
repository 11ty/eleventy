import debugUtil from "debug";

import { inspect } from "../Adapters/Packages/inspect.js";
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
		this.log(e, "warn", "yellow", undefined, [`${msg}:`]);
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
		this.log(e, "error", "red", true, [`${msg}:`]);
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
	log(e, type = "log", chalkColor = "", forceToConsole = false, messages = []) {
		if (process.env.DEBUG) {
			debug("Full error object: %o", inspect(e));
		}

		let showStack = true;
		if (e.skipOriginalStack) {
			// Don’t show the full error stack trace
			showStack = false;
		}

		let totalErrorCount = EleventyErrorHandler.getTotalErrorCount(e);
		let ref = e;
		let index = 1;
		let debugs = [];
		while (ref) {
			let nextRef = ref.originalError;

			// Unwrap cause from error and assign it to what Eleventy expects
			if (nextRef?.cause) {
				nextRef.originalError = nextRef.cause?.originalError ?? nextRef?.cause;
			}

			if (!nextRef && EleventyErrorUtil.hasEmbeddedError(ref.message)) {
				nextRef = EleventyErrorUtil.deconvertErrorToObject(ref);
			}

			if (nextRef?.skipOriginalStack) {
				showStack = false;
			}

			messages.push(
				`${totalErrorCount > 1 ? `${index}. ` : ""}${(
					EleventyErrorUtil.cleanMessage(ref.message) || "(No error message provided)"
				).trim()}${ref.name !== "Error" ? ` (via ${ref.name})` : ""}`,
			);

			if (process.env.DEBUG) {
				debugs.push(`(${type} stack): ${ref.stack}`);
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
					messages.push("\nOriginal error stack trace: " + stackStr);
				}
			}

			ref = nextRef;
			index++;
		}

		if (messages.length) {
			this.logger.message(messages.join("\n"), type, chalkColor, forceToConsole);
		}

		if (debugs.length > 0) {
			for (let msg of debugs) {
				debug(msg);
			}
		}
	}
}

export { EleventyErrorHandler };
