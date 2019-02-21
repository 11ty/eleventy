const TemplateContentPrematureUseError = require("./Errors/TemplateContentPrematureUseError");

class EleventyErrorUtil {
  static isPrematureTemplateContentError(e) {
    // TODO the rest of the template engines
    return (
      e instanceof TemplateContentPrematureUseError ||
      (e.originalError &&
        e.originalError.name === "RenderError" &&
        e.originalError.originalError instanceof
          TemplateContentPrematureUseError) || // Liquid
      e.message.indexOf("TemplateContentPrematureUseError") > -1
    ); // Nunjucks
  }
}

module.exports = EleventyErrorUtil;
