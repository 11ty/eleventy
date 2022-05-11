const { isPlainObject } = require("@11ty/eleventy-utils");

function wrapObject(target, fallback) {
  return new Proxy(target, {
    // Handlebars wants this
    getOwnPropertyDescriptor(target, prop) {
      // console.log( "handler:getOwnPropertyDescriptor", prop );
      if (prop in target) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      } else if (prop in fallback) {
        return Reflect.getOwnPropertyDescriptor(fallback, prop);
      }
    },
    // Liquid needs this
    has(target, prop) {
      // console.log( "handler:has", prop, (prop in target) || (prop in fallback) );
      return prop in target || prop in fallback;
    },
    // Nunjucks needs this
    ownKeys(target) {
      // unique
      let keys = new Set([
        ...Reflect.ownKeys(target),
        ...Reflect.ownKeys(fallback),
      ]);
      // console.log( "handler:ownKeys", keys );
      return Array.from(keys);
    },
    get(target, prop) {
      // console.log( "handler:get", prop );
      if (prop in target) {
        if (isPlainObject(target[prop]) && prop in fallback) {
          return wrapObject(target[prop], fallback[prop]);
        }

        return target[prop];
      }

      return fallback[prop];
    },
    // set(target, prop, value) {
    //   console.log( "handler:set", prop, value );
    //   return Reflect.set(target, prop, value);
    // }
  });
}

function ProxyWrap(target, fallback) {
  if (!isPlainObject(target) || !isPlainObject(fallback)) {
    throw new Error(
      "ProxyWrap expects objects for both the target and fallback"
    );
  }
  let wrapped = wrapObject(target, fallback);
  return wrapped;
}

module.exports = {
  ProxyWrap,
};
