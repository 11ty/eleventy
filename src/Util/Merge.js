const { isPlainObject } = require("@11ty/eleventy-utils");
const OVERRIDE_PREFIX = "override:";

function cleanKey(key, prefix) {
  if (prefix && key.startsWith(prefix)) {
    return key.slice(prefix.length);
  }
  return key;
}

function getMergedItem(target, source, prefixes = {}) {
  let { override } = prefixes;

  // deep copy objects to avoid sharing and to effect key renaming
  if (!target && isPlainObject(source)) {
    target = {};
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    return target.concat(source);
  } else if (isPlainObject(target)) {
    if (isPlainObject(source)) {
      for (let key in source) {
        let overrideKey = cleanKey(key, override);

        target[overrideKey] = getMergedItem(target[key], source[key], prefixes);
      }
    }
    return target;
  }
  // number, string, class instance, etc
  return source;
}

// The same as Merge but without override prefixes
function DeepCopy(targetObject, ...sources) {
  for (let source of sources) {
    if (!source) {
      continue;
    }

    targetObject = getMergedItem(targetObject, source);
  }
  return targetObject;
}

function Merge(target, ...sources) {
  // Remove override prefixes from root target.
  if (isPlainObject(target)) {
    for (let key in target) {
      if (key.indexOf(OVERRIDE_PREFIX) === 0) {
        target[key.slice(OVERRIDE_PREFIX.length)] = target[key];
        delete target[key];
      }
    }
  }

  for (let source of sources) {
    if (!source) {
      continue;
    }
    target = getMergedItem(target, source, {
      override: OVERRIDE_PREFIX,
    });
  }

  return target;
}

module.exports = Merge;
module.exports.DeepCopy = DeepCopy;
