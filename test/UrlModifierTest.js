import test from "ava";
import {parseHTML} from 'linkedom';
import { UrlModifier } from "../src/Util/UrlModifier.js";

test("Change image extensions", async (t) => {
	const {
		document,
		// other exports ..
	} = parseHTML(`<img src="test.jpg" srcset="banner-HD.jpg 2x, banner-phone.jpg 100w">
<input src="test.jpg" type="image">`);

	let nodes = UrlModifier.findNodes(document);

	UrlModifier.modifyNodes(nodes, function(url/*, node*/) {
		if(url) {
			let parts = url.split(".");
			parts.pop();
			return parts.join(".") + ".lol";
		}
		// return false to delete node.
	});

  t.is(document.toString(), `<img src="test.lol" srcset="banner-HD.lol 2x, banner-phone.lol 100w">
<input src="test.lol" type="image">`);
});
