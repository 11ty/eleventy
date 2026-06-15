import { createDebug as createDebugObug } from "obug";

const PREFIX =
	process?.env?.BUILDAWESOME_PACKAGE === "@awesome.me/buildawesome" ? "BuildAwesome:" : "Eleventy:";

export function createDebug(name) {
	return createDebugObug(`${PREFIX}:${name}`);
}
