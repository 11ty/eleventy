import EleventyBaseError from "./EleventyBaseError.js";

class DuplicatePermalinkOutputError extends EleventyBaseError {
	get removeDuplicateErrorStringFromOutput() {
		return true;
	}
}

export default DuplicatePermalinkOutputError;
