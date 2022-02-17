const isPlainObject = require("./IsPlainObject");
const OVERRIDE_PREFIX = "override:";

function getMergedItem(target, source, parentKey) {
  // if key is prefixed with OVERRIDE_PREFIX, it just keeps the new source value (no merging)
  if (parentKey && parentKey.indexOf(OVERRIDE_PREFIX) === 0) {
    return source;
  }

  // deep copy objects to avoid sharing and to effect key renaming
  if (!target && isPlainObject(source)) {
    target = {};
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    return target.concat(source);
  } else if (isPlainObject(target)) {
    if (isPlainObject(source)) {
      for (var key in source) {
        let newKey = key;
        if (key.indexOf(OVERRIDE_PREFIX) === 0) {
          newKey = key.substr(OVERRIDE_PREFIX.length);
        }
        target[newKey] = getMergedItem(target[key], source[key], newKey);
      }
    }
    return target;
  } else {
    // number, string, class instance, etc
    return source;
  }
}
function Merge(target, ...sources) {
  // Remove override prefixes from root target.
  if (isPlainObject(target)) {
    for (var key in target) {
      if (key.indexOf(OVERRIDE_PREFIX) === 0) {
        target[key.substr(OVERRIDE_PREFIX.length)] = target[key];
        delete target[key];
      }
    }
  }

  for (var source of sources) {
    if (!source) {
      continue;
    }
    target = getMergedItem(target, source);
  }

  return target;
}

module.exports = Merge;
