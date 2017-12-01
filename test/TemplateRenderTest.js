import test from "ava";
import ejs from "ejs";
import TemplateRender from "../src/TemplateRender";
import parsePath from "parse-filepath";

test(t => {
	// Path is unnecessary but supported
	t.truthy((new TemplateRender("default.ejs")).parsed);
	t.is((new TemplateRender("default.ejs")).engine, "ejs");

	// Better
	t.truthy((new TemplateRender("ejs")).parsed);
	t.is((new TemplateRender("ejs")).engine, "ejs");
});

test("Unsupported engine", async t => {
	t.is( (new TemplateRender( "doesnotexist" )).engine, "doesnotexist" );

	await t.throws( (new TemplateRender( "doesnotexist" )).getCompiledTemplatePromise("<p></p>") );
});

// EJS
test("EJS", async t => {
	t.is( (new TemplateRender( "ejs" )).engine, "ejs" );

	let fn = await (new TemplateRender( "ejs" )).getCompiledTemplatePromise("<p><%= name %></p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Markdown
test("Markdown", t => {
	t.is( (new TemplateRender( "md" )).engine, "md" );
});

test("Markdown: Parses base markdown", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# Header");
	t.is( (await fn()).trim(), "<h1>Header</h1>" );
});

test("Markdown: Parses templates using default engine", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# <%=title %>");
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("Markdown: Override markdown engine no data", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# My Title", {
		parseMarkdownWith: "liquid"
	});

	t.is( (await fn()).trim(), "<h1>My Title</h1>" );
});

test("Markdown: Override markdown engine", async t => {
	let fn = await ((new TemplateRender( "md" )).getCompiledTemplatePromise("# {{title}}", {
		parseMarkdownWith: "liquid"
	}));
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("Markdown: Set markdown engine to false", async t => {
	let fn = await ((new TemplateRender( "md" )).getCompiledTemplatePromise("# {{title}}", {
		parseMarkdownWith: false
	}));
	t.is( (await fn()).trim(), "<h1>{{title}}</h1>" );
});

test("Markdown: Change the default engine", async t => {
	let tr = new TemplateRender( "md" );
	tr.setDefaultMarkdownEngine("liquid");

	let fn = await (tr.getCompiledTemplatePromise("# {{title}}"));
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("Markdown: Change the default engine and pass in an override", async t => {
	let tr = new TemplateRender( "md" );
	tr.setDefaultMarkdownEngine("njk");

	let fn = await (tr.getCompiledTemplatePromise("# {{title}}", {
		parseMarkdownWith: "liquid"
	}));

	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

// Handlebars
test("Handlebars", async t => {
	t.is( (new TemplateRender( "hbs" )).engine, "hbs" );

	let fn = await (new TemplateRender( "hbs" )).getCompiledTemplatePromise("<p>{{name}}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Mustache
test("Mustache", async t => {
	t.is( (new TemplateRender( "mustache" )).engine, "mustache" );

	let fn = await (new TemplateRender( "mustache" )).getCompiledTemplatePromise("<p>{{name}}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Haml
test("Haml", async t => {
	t.is( (new TemplateRender( "haml" )).engine, "haml" );

	let fn = await (new TemplateRender( "haml" )).getCompiledTemplatePromise("%p= name");
	t.is( (await fn({name: "Zach"})).trim(), "<p>Zach</p>" );
});

// Pug
test("Pug", async t => {
	t.is( (new TemplateRender( "pug" )).engine, "pug" );

	let fn = await (new TemplateRender( "pug" )).getCompiledTemplatePromise("p= name");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Nunjucks
test("Nunjucks", async t => {
	t.is( (new TemplateRender( "njk" )).engine, "njk" );

	let fn = await (new TemplateRender( "njk" )).getCompiledTemplatePromise("<p>{{ name }}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Liquid
test("Liquid", async t => {
	t.is( (new TemplateRender( "liquid" )).engine, "liquid" );

	let fn = await (new TemplateRender( "liquid" )).getCompiledTemplatePromise("<p>{{name | capitalize}}</p>");
	t.is(await fn({name: "tim"}), "<p>Tim</p>" );
});