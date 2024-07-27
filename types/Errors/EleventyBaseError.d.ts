export default EleventyBaseError;
/**
 * This class serves as basis for all Eleventy-specific errors.
 * @ignore
 */
declare class EleventyBaseError extends Error {
    /**
     * @param {string} message - The error message to display.
     * @param {unknown} [originalError] - The original error caught.
     */
    constructor(message: string, originalError?: unknown);
    originalError: {} | undefined;
}
