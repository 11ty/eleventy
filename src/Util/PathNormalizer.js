import path from "path";

class PathNormalizer {
  static normalizeSeperator(inputPath) {
    if (!inputPath) {
      return inputPath;
    }
    return inputPath.split(path.sep).join("/");
  }
}

export default PathNormalizer;
