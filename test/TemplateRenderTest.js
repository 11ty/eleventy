import test from "ava";
import ejs from "ejs";
import TemplateRender from "../src/TemplateRender";
import normalize from "normalize-path";
import parsePath from "parse-filepath";
import path from "path";

test(t => {
	// Path is unnecessary but supported
	t.truthy((new TemplateRender("default.ejs")).parsed);
	t.is((new TemplateRender("default.ejs")).getEngineName(), "ejs");

	// Better
	t.truthy((new TemplateRender("ejs")).parsed);
	t.is((new TemplateRender("ejs")).getEngineName(), "ejs");
});

test("Input Dir", async t => {
	t.is( (new TemplateRender( "ejs", "./test/stubs" )).getInputDir(), "test/stubs/_includes" );
});

test("Unsupported engine", async t => {
	t.is( (new TemplateRender( "doesnotexist" )).getEngineName(), "doesnotexist" );

	await t.throws( (new TemplateRender( "doesnotexist" )).getCompiledTemplatePromise("<p></p>") );
});

// HTML
test("HTML", async t => {
	t.is( (new TemplateRender( "html" )).getEngineName(), "html" );

	let fn = await (new TemplateRender( "html" )).getCompiledTemplatePromise("<p>Paragraph</p>");
	t.is( await fn(), "<p>Paragraph</p>" );
	t.is( await fn({}), "<p>Paragraph</p>" );
});

test("HTML: Parses markdown using liquid engine (default, with data)", async t => {
	let fn = await (new TemplateRender( "html" )).getCompiledTemplatePromise("<h1>{{title}}</h1>");
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("HTML: Parses markdown using ejs engine", async t => {
	let fn = await (new TemplateRender( "html" )).getCompiledTemplatePromise("<h1><%=title %></h1>", {
		parseHtmlWith: "ejs"
	});
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});
test("HTML: Set markdown engine to false, don’t parse", async t => {
	let fn = await ((new TemplateRender( "html" )).getCompiledTemplatePromise("<h1>{{title}}</h1>", {
		parseHtmlWith: false
	}));
	t.is( (await fn()).trim(), "<h1>{{title}}</h1>" );
});

test("HTML: Change the default engine", async t => {
	let tr = new TemplateRender( "html" );
	tr.setDefaultHtmlEngine("ejs");

	let fn = await (tr.getCompiledTemplatePromise("<h1><%= title %></h1>"));
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("HTML: Change the default engine and pass in an override", async t => {
	let tr = new TemplateRender( "html" );
	tr.setDefaultHtmlEngine("njk");

	let fn = await (tr.getCompiledTemplatePromise("<h1>{{title}}</h1>", {
		parseHtmlWith: "liquid"
	}));

	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});


// EJS
test("EJS", async t => {
	t.is( (new TemplateRender( "ejs" )).getEngineName(), "ejs" );

	let fn = await (new TemplateRender( "ejs" )).getCompiledTemplatePromise("<p><%= name %></p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

test("EJS Include", async t => {
	t.is( path.resolve(undefined, "/included" ), "/included" );

	let fn = await (new TemplateRender( "ejs", "./test/stubs/" )).getCompiledTemplatePromise("<p><% include /included %></p>");
	t.is(await fn(), "<p>This is an include.</p>" );
});

// Markdown
test("Markdown", t => {
	t.is( (new TemplateRender( "md" )).getEngineName(), "md" );
});

test("Markdown: Parses base markdown, no data", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# My Title");
	t.is( (await fn()).trim(), "<h1>My Title</h1>" );
});
test("Markdown: Parses markdown using liquid engine (default, with data)", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# {{title}}");
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});
test("Markdown: Parses markdown using ejs engine", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# <%=title %>", {
		parseMarkdownWith: "ejs"
	});
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});
test("Markdown: Set markdown engine to false, don’t parse", async t => {
	let fn = await ((new TemplateRender( "md" )).getCompiledTemplatePromise("# {{title}}", {
		parseMarkdownWith: false
	}));
	t.is( (await fn()).trim(), "<h1>{{title}}</h1>" );
});

test("Markdown: Change the default engine", async t => {
	let tr = new TemplateRender( "md" );
	tr.setDefaultMarkdownEngine("ejs");

	let fn = await (tr.getCompiledTemplatePromise("# <%= title %>"));
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
	t.is( (new TemplateRender( "hbs" )).getEngineName(), "hbs" );

	let fn = await (new TemplateRender( "hbs" )).getCompiledTemplatePromise("<p>{{name}}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Mustache
test("Mustache", async t => {
	t.is( (new TemplateRender( "mustache" )).getEngineName(), "mustache" );

	let fn = await (new TemplateRender( "mustache" )).getCompiledTemplatePromise("<p>{{name}}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Haml
test("Haml", async t => {
	t.is( (new TemplateRender( "haml" )).getEngineName(), "haml" );

	let fn = await (new TemplateRender( "haml" )).getCompiledTemplatePromise("%p= name");
	t.is( (await fn({name: "Zach"})).trim(), "<p>Zach</p>" );
});

// Pug
test("Pug", async t => {
	t.is( (new TemplateRender( "pug" )).getEngineName(), "pug" );

	let fn = await (new TemplateRender( "pug" )).getCompiledTemplatePromise("p= name");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Nunjucks
test("Nunjucks", async t => {
	t.is( (new TemplateRender( "njk" )).getEngineName(), "njk" );

	let fn = await (new TemplateRender( "njk" )).getCompiledTemplatePromise("<p>{{ name }}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

// Liquid
test("Liquid", async t => {
	t.is( (new TemplateRender( "liquid" )).getEngineName(), "liquid" );

	let fn = await (new TemplateRender( "liquid" )).getCompiledTemplatePromise("<p>{{name | capitalize}}</p>");
	t.is(await fn({name: "tim"}), "<p>Tim</p>" );
});

test("Liquid Include", async t => {
	t.is( (new TemplateRender( "liquid", "./test/stubs/" )).getEngineName(), "liquid" );

	let fn = await (new TemplateRender( "liquid_include_test.liquid", "./test/stubs/" )).getCompiledTemplatePromise("<p>{% include 'included' %}</p>");
	t.is(await fn(), "<p>This is an include.</p>" );
});