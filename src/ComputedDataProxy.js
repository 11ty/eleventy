const lodashSet = require("lodash/set");
const lodashGet = require("lodash/get");
const lodashIsPlainObject = require("lodash/isPlainObject");

class ComputedDataProxy {
  constructor(computedKeys) {
    if (Array.isArray(computedKeys)) {
      this.computedKeys = new Set(computedKeys);
    } else {
      this.computedKeys = computedKeys;
    }
  }

  isArrayOrPlainObject(data) {
    return Array.isArray(data) || lodashIsPlainObject(data);
  }

  getProxyData(data, keyRef) {
    let undefinedValue = "__11TY_UNDEFINED__";
    if (this.computedKeys) {
      for (let key of this.computedKeys) {
        if (lodashGet(data, key, undefinedValue) === undefinedValue) {
          lodashSet(data, key, "");
        }
      }
    }

    return this._getProxyData(data, keyRef);
  }

  _getProxyData(data, keyRef, parentKey = "") {
    if (lodashIsPlainObject(data)) {
      return new Proxy(
        {},
        {
          get: (obj, key) => {
            if (typeof key !== "string") {
              return obj[key];
            }
            let newKey = `${parentKey ? `${parentKey}.` : ""}${key}`;
            let newData = this._getProxyData(data[key], keyRef, newKey);
            if (!this.isArrayOrPlainObject(newData)) {
              keyRef.add(newKey);
            }
            return newData;
          }
        }
      );
    } else if (Array.isArray(data)) {
      return new Proxy([], {
        get: (obj, key) => {
          // why
          if (key === "then") {
            keyRef.add(parentKey);
            return;
          }
          let newKey = `${parentKey}[${key}]`;
          let newData = this._getProxyData(data[key], keyRef, newKey);
          if (!this.isArrayOrPlainObject(newData)) {
            keyRef.add(newKey);
          }
          return newData;
        }
      });
    }

    // everything else!
    return data;
  }

  async findVarsUsed(fn, data = {}) {
    let keyRef = new Set();

    // careful, logging proxyData will mess with test results!
    let proxyData = this.getProxyData(data, keyRef);

    // squelch console logs for this fake proxy data pass 😅
    // let savedLog = console.log;
    // console.log = () => {};
    await fn(proxyData);
    // console.log = savedLog;

    return Array.from(keyRef);
  }
}

module.exports = ComputedDataProxy;
