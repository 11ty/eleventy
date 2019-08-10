class EleventyBaseError extends Error {
  constructor(message, originalError) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;

    this.originalError = originalError;
  }
}
module.exports = EleventyBaseError;
