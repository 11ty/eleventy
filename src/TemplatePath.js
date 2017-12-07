const path = require("path");
const normalize = require("normalize-path");

function TemplatePath() {}

TemplatePath.getModuleDir = function() {
	return path.resolve(__dirname, "..");
};

TemplatePath.getWorkingDir = function() {
	return path.resolve("./");
};

/* Outputs ./SAFE/LOCAL/PATHS/WITHOUT/TRAILING/SLASHES */
TemplatePath.normalize = function() {
	return normalize( path.join.apply(null, [...arguments]) );
};

module.exports = TemplatePath;