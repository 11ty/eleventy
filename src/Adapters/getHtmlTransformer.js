import { HtmlTransformer } from "../Util/HtmlTransformer.js";

export function getHtmlTransformer(templateConfig) {
	let ut = new HtmlTransformer();
	ut.setUserConfig(templateConfig);
	return ut;
}
