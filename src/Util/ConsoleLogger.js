import debugUtil from "debug";
import chalk from "../Adapters/Packages/chalk.js";

const debug = debugUtil("Eleventy:Logger");

/**
 * Logger implementation that logs to STDOUT.
 * @typedef {'error'|'log'|'warn'|'info'} LogType
 */
class ConsoleLogger {
	/** @type {boolean} */
	#isVerbose = true;
	/** @type {boolean} */
	#isChalkEnabled = true;
	/** @type {object|boolean|undefined} */
	#logger;

	constructor() {}

	isLoggingEnabled() {
		if (!this.isVerbose || process.env.DEBUG) {
			return true;
		}
		return this.#logger !== false;
	}

	get isVerbose() {
		return this.#isVerbose;
	}

	set isVerbose(verbose) {
		this.#isVerbose = !!verbose;
	}

	get isChalkEnabled() {
		return this.#isChalkEnabled;
	}

	set isChalkEnabled(enabled) {
		this.#isChalkEnabled = !!enabled;
	}

	overrideLogger(logger) {
		this.#logger = logger;
	}

	get logger() {
		return this.#logger || console;
	}

	/** @param {string} msg */
	log(msg) {
		this.message(msg);
	}

	/**
	 * @typedef LogOptions
	 * @property {string} message
	 * @property {string=} prefix
	 * @property {LogType=} type
	 * @property {string=} color
	 * @property {boolean=} force
	 * @param {LogOptions} options
	 */
	logWithOptions({ message, type, prefix, color, force }) {
		this.message(message, type, color, force, prefix);
	}

	/** @param {string} msg */
	forceLog(msg) {
		this.message(msg, undefined, undefined, true);
	}

	/** @param {string} msg */
	info(msg) {
		this.message(msg, "log", "blue");
	}

	/** @param {string} msg */
	warn(msg) {
		this.message(msg, "warn", "yellow");
	}

	/** @param {string} msg */
	error(msg) {
		this.message(msg, "error", "red");
	}

	/**
	 * Formats the message to log.
	 *
	 * @param {string} message - The raw message to log.
	 * @param {LogType} [type='log'] - The error level to log.
	 * @param {string|undefined} [chalkColor=undefined] - Color name or falsy to disable
	 * @param {boolean} [forceToConsole=false] - Enforce a log on console instead of specified target.
	 */
	message(
		message,
		type = "log",
		chalkColor = undefined,
		forceToConsole = false,
		prefix = "[11ty]",
	) {
		if (!forceToConsole && (!this.isVerbose || process.env.DEBUG)) {
			debug(message);
		} else if (this.#logger !== false) {
			message = `${chalk.gray(prefix)} ${message.split("\n").join(`\n${chalk.gray(prefix)} `)}`;

			if (chalkColor && this.isChalkEnabled) {
				this.logger[type](chalk[chalkColor](message));
			} else {
				this.logger[type](message);
			}
		}
	}
}

export default ConsoleLogger;
