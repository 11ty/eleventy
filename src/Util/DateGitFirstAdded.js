const spawn = require("cross-spawn");

function getGitFirstAddedTimeStamp(filePath) {
  return (
    parseInt(
      spawn
        .sync(
          "git",
          // Formats https://www.git-scm.com/docs/git-log#_pretty_formats
          // %at author date, UNIX timestamp
          ["log", "--diff-filter=A", "--follow", "-1", "--format=%at", filePath]
        )
        .stdout.toString("utf-8")
    ) * 1000
  );
}

// return a Date
module.exports = function (inputPath) {
  let timestamp = getGitFirstAddedTimeStamp(inputPath);
  if (timestamp) {
    return new Date(timestamp);
  }
};
