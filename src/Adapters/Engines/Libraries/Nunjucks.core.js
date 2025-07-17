// Otherwise the bundler attempts to use the browser version of Nunjucks (which doesn’t route through our polyfilled `fs` module)
export {
	default as NunjucksLib,
	Environment,
	FileSystemLoader,
	Template,
} from "../../../../node_modules/nunjucks/index.js";
