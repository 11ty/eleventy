// This test file is using Node’s test runner because `tsx` doesn’t work with worker threads (used by avajs)
// See https://github.com/privatenumber/tsx/issues/354
// See https://github.com/nodejs/node/issues/47747
import test from "node:test";
import assert from "node:assert";
import { renderToStaticMarkup } from "react-dom/server";

// Typically import 'tsx/esm'; but we use register method to work with test isolation
// import { register } from 'tsx/esm/api'
import "tsx/esm";
// import 'tsimp';

import Eleventy from "../src/Eleventy.js";

test("Eleventy with JSX", async () => {
	let elev = new Eleventy("./test/stubs-fancyjs/test.11ty.tsx", undefined, {
		config: (eleventyConfig) => {
			eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
				key: "11ty.js",
				compile: function () {
					return async function (data) {
						let content = await this.defaultRenderer(data);
						return renderToStaticMarkup(content);
					};
				},
			});
		},
	});
	elev.disableLogger();
	elev.setFormats("11ty.tsx");

	let results = await elev.toJSON();
	assert.strictEqual(results.length, 1);

	assert.strictEqual(results[0].content, `<div>hello world 1</div>`);
});

// test("Eleventy no formats", async (t) => {
//   const unregister = register();

//   let elev = new Eleventy("./test/stubs-fancyjs/", undefined, {
//     config: eleventyConfig => {
//       eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
//         key: "11ty.js",
//         compile: function() {
//           return async function(data) {
//             let content = await this.defaultRenderer(data);
//             return renderToStaticMarkup(content);
//           };
//         }
//       });
//     }
//   });
//   elev.disableLogger();
//   // elev.setFormats("")

//   let results = await elev.toJSON();
//   t.is(results.length, 0);

//   unregister();
// });

// test("Eleventy JSX --formats=11ty.tsx", async (t) => {
//   const unregister = register();

//   let elev = new Eleventy("./test/stubs-fancyjs/", undefined, {
//     config: eleventyConfig => {
//       eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
//         key: "11ty.js",
//         compile: function() {
//           return async function(data) {
//             let content = await this.defaultRenderer(data);
//             return renderToStaticMarkup(content);
//           };
//         }
//       });
//     }
//   });
//   elev.disableLogger();
//   elev.setFormats("11ty.tsx")

//   let results = await elev.toJSON();
//   t.is(results.length, 1);

//   t.is(results[0].content, `<div>hello world 1</div>`);

//   unregister();
// });

// test("Eleventy JSX --formats=tsx", async (t) => {
//   const unregister = register();

//   let elev = new Eleventy("./test/stubs-fancyjs/", undefined, {
//     config: eleventyConfig => {
//       eleventyConfig.addExtension(["11ty.jsx", "11ty.ts", "11ty.tsx"], {
//         key: "11ty.js",
//         compile: function() {
//           return async function(data) {
//             let content = await this.defaultRenderer(data);
//             return renderToStaticMarkup(content);
//           };
//         }
//       });
//     }
//   });
//   elev.disableLogger();
//   elev.setFormats("tsx"); // should not pick up 11ty.tsx

//   let results = await elev.toJSON();
//   t.is(results.length, 0); // Should have no results!!

//   unregister();
// });
