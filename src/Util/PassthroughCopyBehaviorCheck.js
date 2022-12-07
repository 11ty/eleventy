function isUsingEleventyDevServer(config) {
  return (
    !config.serverOptions.module ||
    config.serverOptions.module === "@11ty/eleventy-dev-server"
  );
}

// Config opt-out via serverPassthroughCopyBehavior
// False when other server is used
// False when runMode is "build" or "watch"
module.exports = function (config, runMode) {
  return (
    config.serverPassthroughCopyBehavior === "passthrough" &&
    isUsingEleventyDevServer(config) &&
    runMode === "serve"
  );
};
