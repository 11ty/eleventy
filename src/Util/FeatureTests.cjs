function canRequireTypeScript() {
	try {
		let res = require("./TypeScript/TypeScriptSample.cts");
		return typeof res === "function";
	} catch(e) {
		// Not supported in node_modules, but we know it is supported!
		if(e.code === "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING") {
      return true;
    }
		return false;
	}
}

const TYPESCRIPT_ENABLED = canRequireTypeScript();

module.exports.isTypeScriptSupported = function() {
	return TYPESCRIPT_ENABLED;
}
