const path = require("path");

// Returns true if subfolder is in parent (accepts absolute or relative paths for both)
module.exports = function (parent, subfolder) {
  if (path.resolve(subfolder).startsWith(path.resolve(parent))) {
    return true;
  }
  return false;
};
