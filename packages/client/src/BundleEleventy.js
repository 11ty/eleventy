import "./shims/shim-core.js";

export { default as BundlePlugin } from "@11ty/eleventy-plugin-bundle";
// The i18n Plugin is not included.
// export { default as I18nPlugin } from "../../../src/Plugins/I18nPlugin.js";
export { IdAttributePlugin } from "../../../src/Plugins/IdAttributePlugin.js";
export { default as HtmlBasePlugin } from "../../../src/Plugins/HtmlBasePlugin.js";
export { TransformPlugin as InputPathToUrlTransformPlugin } from "../../../src/Plugins/InputPathToUrl.js";
export { default as RenderPlugin } from "../../../src/Plugins/RenderPlugin.js";

export { Core as Eleventy } from "../../../src/Core.js";

export { default as FileSystem } from "node:fs";
