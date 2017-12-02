const fs = require("fs-extra");

const TemplateComponents = require("./TemplateComponents");
const TemplateRender = require("./TemplateRender");

const pkg = require("../package.json");
const cfg = require("../config.json");

function TemplateData(globalDataPath, templateComponents) {
	this.globalDataPath = globalDataPath;
	this.rawImports = {
		_package: pkg
	};
	this.components = templateComponents;
}

TemplateData.prototype.getData = async function() {
	let json = await this.getJson(this.globalDataPath, this.rawImports);

	// without components
	this.rawData = Object.assign({}, json, this.rawImports );

	// with components
	this.globalData = Object.assign({}, this.rawData, {
		_components: {}
	});

	if( this.components ) {
		this.globalData._components = await this.components.getComponents(this);
	}

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

	// no components allowed here
	// <%= _components.component({componentStr: 'test'}) %>
	// pass in rawImports, don’t pass in global data, that’s what we’re parsing
	let str = fn(rawImports);
	return JSON.parse(str);
};

module.exports = TemplateData;
