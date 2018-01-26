class EleventyError {
  constructor(newErrorObj, oldErrorObj) {
    this.errors = [newErrorObj, oldErrorObj];
  }

  // if already an existing EleventyError, will push on to stack instead of creating a new EleventyError obj
  static make(newErrorObj, oldErrorObj) {
    if (oldErrorObj instanceof EleventyError) {
      oldErrorObj.add(newErrorObj);
      return oldErrorObj;
    } else {
      return new EleventyError(newErrorObj, oldErrorObj);
    }
  }

  add(errorObj) {
    this.errors.push(errorObj);
  }

  getAll() {
    return this.errors;
  }

  log() {
    let str = [];
    for (let err of this.errors) {
      str.push(` * ${err}`);
    }
    return str.join("\n");
  }
}

module.exports = EleventyError;
