class ComputedDataProxy {
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
            keyReference.push(newPath.join("."));
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
