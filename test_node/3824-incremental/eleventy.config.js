import { register } from "tsx/esm/api";

import { jsxToString } from "jsx-async-runtime";
// import { renderToStaticMarkup } from "react-dom/server";

export default async function (eleventyConfig) {
	eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
		key: "11ty.js",
		compile: async function (inputContent, inputPath) {
			this.addDependencies(inputPath, ["./test_node/3824-incremental/_includes/head.tsx"]);

			return async function (data) {
				let content = await this.defaultRenderer(data);
				return jsxToString(content);
				// return renderToStaticMarkup(content);
			};
		},
	});

	eleventyConfig.addTemplateFormats(["11ty.jsx", "11ty.tsx"]);

	let unregister;
	eleventyConfig.on("eleventy.before", () => {
		unregister = register({
			// custom tsconfig
			tsconfig: "test_node/3824-incremental/tsconfig-3824.json",
		});
	});
	eleventyConfig.on("eleventy.after", () => {
		unregister();
	});
}
