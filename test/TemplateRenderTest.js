import test from "ava";
import ejs from "ejs";
import TemplateRender from "../src/TemplateRender";

// EJS
test(t => {
	t.is( (new TemplateRender( "default.ejs" )).parsed.ext, ".ejs" );
});
test(async t => {
	let fn = await (new TemplateRender( "default.ejs" )).getCompiledTemplatePromise("<p><%= name %></p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Markdown
test(t => {
	t.is( (new TemplateRender( "markdown.md" )).parsed.ext, ".md" );
});
test(async t => {
	let fn = await (new TemplateRender( "markdown.md" )).getCompiledTemplatePromise("# Header");
	t.is( (await fn()).trim(), "<h1>Header</h1>" );
});

// Handlebars
test(t => {
	t.is( (new TemplateRender( "handlebars.hbs" )).parsed.ext, ".hbs" );
});
test(async t => {
	let fn = await (new TemplateRender( "handlebars.hbs" )).getCompiledTemplatePromise("<p>{{name}}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Mustache
test(t => {
	t.is( (new TemplateRender( "mustache.mustache" )).parsed.ext, ".mustache" );
});
test(async t => {
	let fn = await (new TemplateRender( "mustache.mustache" )).getCompiledTemplatePromise("<p>{{name}}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Haml
test(t => {
	t.is( (new TemplateRender( "haml.haml" )).parsed.ext, ".haml" );
});
test(async t => {
	let fn = await (new TemplateRender( "haml.haml" )).getCompiledTemplatePromise("%p= name");
	t.is( (await fn({name: "Zach"})).trim(), "<p>Zach</p>" );
});

// Pug
test(t => {
	t.is( (new TemplateRender( "pug.pug" )).parsed.ext, ".pug" );
});
test(async t => {
	let fn = await (new TemplateRender( "pug.pug" )).getCompiledTemplatePromise("p= name");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Nunjucks
test(t => {
	t.is( (new TemplateRender( "nunjucks.njk" )).parsed.ext, ".njk" );
});
test(async t => {
	let fn = await (new TemplateRender( "nunjucks.njk" )).getCompiledTemplatePromise("<p>{{ name }}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Liquid
test(t => {
	t.is( (new TemplateRender( "liquid.liquid" )).parsed.ext, ".liquid" );
});
test(async t => {
	let fn = await (new TemplateRender( "liquid.liquid" )).getCompiledTemplatePromise("<p>{{name | capitalize}}</p>");
	t.is(await fn({name: "tim"}), "<p>Tim</p>" );
});