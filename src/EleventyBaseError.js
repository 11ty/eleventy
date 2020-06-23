class EleventyBaseError extends Error {
  constructor(message, originalError) {
    super(message);

    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);

    if (originalError) {
      this.originalError = originalError;
    }
  }
}
module.exports = EleventyBaseError;
