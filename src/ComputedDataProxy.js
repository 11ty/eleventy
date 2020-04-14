class ComputedDataProxy {
  constructor(computedKeys) {
    if (Array.isArray(computedKeys)) {
      this.computedKeys = new Set(computedKeys);
    } else {
      this.computedKeys = computedKeys;
    }
  }

  _createDeepProxy(keyReference, path = []) {
    let self = this;
    return new Proxy(
      {},
      {
        get(target, key) {
          if (target[key]) {
            return target[key];
          }
          let newPath = [...path, key];
          if (typeof key === "string") {
            // if `page.url`, remove `page` etc
            let parentIndex = keyReference.indexOf(path.join("."));
            if (parentIndex > -1) {
              keyReference.splice(parentIndex, 1);
            }
            let fullPath = newPath.join(".");
            keyReference.push(fullPath);

            // return string for computed key values
            if (self.computedKeys.has(fullPath)) {
              return "";
            }

            return self._createDeepProxy(keyReference, newPath);
          }
        }
      }
    );
  }

  getProxyData(keyReference) {
    return this._createDeepProxy(keyReference);
  }

  async findVarsUsed(fn) {
    let keyReference = [];
    // careful, logging proxyData will mess with test results!
    let proxyData = this.getProxyData(keyReference);

    // squelch console logs for this fake proxy data pass 😅
    let savedLog = console.log;
    console.log = () => {};
    await fn(proxyData);
    console.log = savedLog;

    return keyReference;
  }
}

module.exports = ComputedDataProxy;
