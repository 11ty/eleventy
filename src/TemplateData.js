const fs = require("fs-extra");

const TemplateRender = require("./TemplateRender");

const pkg = require("../package.json");
const cfg = require("../config.json");

function TemplateData(globalDataPath) {
	this.globalDataPath = globalDataPath;
	this.rawImports = {
		_package: pkg
	};
}

TemplateData.prototype.getData = async function() {
	let json = await this.getJson(this.globalDataPath, this.rawImports);

	this.globalData = Object.assign({}, json, this.rawImports );

	return this.globalData;
};

TemplateData.prototype.getJson = async function(path, rawImports) {
	// todo convert to readFile with await (and promisify?)
	let rawInput;
	try {
		rawInput = fs.readFileSync(path, "utf-8");
	} catch(e) {
		// if file does not exist, return empty obj
		return {};
	}

	let fn = await (new TemplateRender(cfg.jsonDataTemplateEngine)).getCompiledTemplatePromise(rawInput);

	// pass in rawImports, don’t pass in global data, that’s what we’re parsing
	let str = fn(rawImports);
	return JSON.parse(str);
};

module.exports = TemplateData;
