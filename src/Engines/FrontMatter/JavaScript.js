import { RetrieveGlobals } from "../../Adapters/RetrieveGlobals.js";

// `javascript` Front Matter Type
export default function (frontMatterCode, context = {}) {
	let { filePath } = context;

	// context.language would be nice as a guard, but was unreliable
	if (frontMatterCode.trimStart().startsWith("{")) {
		return context.engines.jsLegacy.parse(frontMatterCode, context);
	}

	return RetrieveGlobals(frontMatterCode, filePath);
}
