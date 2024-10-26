function canRequireModules() {
	// via --experimental-require-module or newer than Node 22 support when this flag is no longer necessary
	try {
		require("./Util/Objects/SampleModule.mjs");
		return true;
	} catch(e) {
		if(e.code === "ERR_REQUIRE_ESM") {
			return false;
		}

		// Rethrow if not an ESM require error.
		throw e;
	}
}

if(!canRequireModules()) {
	let error = new Error(`\`require("@11ty/eleventy")\` is incompatible with Eleventy v3 and this version of Node. You have a few options:
   1. (Easiest) Change the \`require\` to use a dynamic import inside of an asynchronous CommonJS configuration
      callback, for example:

      module.exports = async function {
        const {EleventyRenderPlugin, EleventyI18nPlugin, EleventyHtmlBasePlugin} = await import("@11ty/eleventy");
      }

   2. (Easier) Update the JavaScript syntax in your configuration file from CommonJS to ESM (change \`require\`
      to use \`import\` and rename the file to have an \`.mjs\` file extension).

   3. (More work) Change your project to use ESM-first by adding \`"type": "module"\` to your package.json. Any
      \`.js\` will need to be ported to use ESM syntax (or renamed to \`.cjs\`.)

   4. (Short term workaround) Use the --experimental-require-module flag to enable this behavior. Read
      more: https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require It is possible that the
      newest version of Node has this enabled by default—you can try upgrading your version of Node.js.`);

	error.skipOriginalStack = true;

	throw error;
}

// If we made it here require(ESM) works fine (via --experimental-require-module or newer Node.js defaults)
let mod = require("./Eleventy.js");

module.exports = mod;
