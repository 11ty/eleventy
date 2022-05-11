const { createHash } = require("crypto");

class EdgeTemplateDataID {
  constructor() {
    this.data = {};
  }

  reset() {
    this.data = {};
  }

  hasData(data = {}) {
    return Object.keys(data).length > 0;
  }

  getDataKey(data = {}) {
    if (!this.hasData(data)) {
      return;
    }

    let hash = createHash("sha256");
    hash.update(JSON.stringify(data));
    return "ELEVENTYEDGEDATA_" + hash.digest("hex");
  }

  addData(data) {
    let key = this.getDataKey(data);
    if (key) {
      this.data[key] = data;
      return key;
    }
  }

  toString() {
    return `"buildTimeData": ${JSON.stringify(this.data, null, 2)}`;
  }
}

module.exports = EdgeTemplateDataID;
