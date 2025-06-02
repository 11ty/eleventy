import fs from 'fs';
import { RenderPlugin } from '../../src/Eleventy.js';
const { RenderManager } = RenderPlugin;

export default function(eleventyConfig) {
	const rm = new RenderManager();

	eleventyConfig.on('eleventy.config', cfg => {
		rm.templateConfig = cfg;
	});

	eleventyConfig.addAsyncShortcode('promo', async function (promoType) {
		let content = fs.readFileSync('./test/stubs-3810/_includes/promo.njk').toString();

		const fn = await rm.compile(content, 'njk');

		return fn({ promoType });
	});
}

export const config = {
	markdownTemplateEngine: "njk",
}