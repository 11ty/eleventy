/**
 * This class serves as basis for all Eleventy-specific errors.
 * @ignore
 */
class EleventyBaseError extends Error {
	/**
	 * @param {string} message - The error message to display.
	 * @param {Error} originalError - The original error caught.
	 */
	constructor(message, originalError) {
		super(message);

		this.name = this.constructor.name;

		Error.captureStackTrace(this, this.constructor);

		if (originalError) {
			this.originalError = originalError;
		}
	}
}
export default EleventyBaseError;
