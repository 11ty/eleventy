import "./shims/shim-core.js";

// export { I18nPlugin } from "../Plugins/I18nPlugin.js";
export { IdAttributePlugin } from "../Plugins/IdAttributePlugin.js";
export { BundlePlugin } from "../Plugins/BundlePlugin.js";
export { HtmlBasePlugin } from "../Plugins/HtmlBasePlugin.js";
export { InputPathToUrlTransformPlugin } from "../Plugins/InputPathToUrlPlugin.js";
export { RenderPlugin } from "../Plugins/RenderPlugin.js";

export { Core as Eleventy } from "../../Core.js";

export { default as FileSystem } from "node:fs";
