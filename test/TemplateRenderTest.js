import test from "ava";
import TemplateRender from "../src/TemplateRender";
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
test("HTML", t => {
	t.is( (new TemplateRender( "html" )).getEngineName(), "html" );
});

test("HTML Render", async t => {
	let fn = await (new TemplateRender( "html" )).getCompiledTemplatePromise("<p>Paragraph</p>");
	t.is( await fn(), "<p>Paragraph</p>" );
	t.is( await fn({}), "<p>Paragraph</p>" );
});

test("HTML Render: Parses markdown using liquid engine (default, with data)", async t => {
	let fn = await (new TemplateRender( "html" )).getCompiledTemplatePromise("<h1>{{title}}</h1>");
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("HTML Render: Parses markdown using ejs engine", async t => {
	let fn = await (new TemplateRender( "html" )).getCompiledTemplatePromise("<h1><%=title %></h1>", {
		parseHtmlWith: "ejs"
	});
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});
test("HTML Render: Set markdown engine to false, don’t parse", async t => {
	let fn = await ((new TemplateRender( "html" )).getCompiledTemplatePromise("<h1>{{title}}</h1>", {
		parseHtmlWith: false
	}));
	t.is( (await fn()).trim(), "<h1>{{title}}</h1>" );
});

test("HTML Render: Change the default engine", async t => {
	let tr = new TemplateRender( "html" );
	tr.setDefaultHtmlEngine("ejs");

	let fn = await (tr.getCompiledTemplatePromise("<h1><%= title %></h1>"));
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("HTML Render: Change the default engine and pass in an override", async t => {
	let tr = new TemplateRender( "html" );
	tr.setDefaultHtmlEngine("njk");

	let fn = await (tr.getCompiledTemplatePromise("<h1>{{title}}</h1>", {
		parseHtmlWith: "liquid"
	}));

	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});


// EJS
test("EJS", t => {
	t.is( (new TemplateRender( "ejs" )).getEngineName(), "ejs" );
});

test("EJS Render", async t => {
	let fn = await (new TemplateRender( "ejs" )).getCompiledTemplatePromise("<p><%= name %></p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

test("EJS Render Include", async t => {
	t.is( path.resolve(undefined, "/included" ), "/included" );

	let fn = await (new TemplateRender( "ejs", "./test/stubs/" )).getCompiledTemplatePromise("<p><% include /included %></p>");
	t.is(await fn(), "<p>This is an include.</p>" );
});

test("EJS Render Include, New Style", async t => {
	let fn = await (new TemplateRender( "ejs", "./test/stubs/" )).getCompiledTemplatePromise("<p><%- include('/included', {}) %></p>");
	t.is(await fn(), "<p>This is an include.</p>" );
});

test("EJS Render Include, New Style with Data", async t => {
	let fn = await (new TemplateRender( "ejs", "./test/stubs/" )).getCompiledTemplatePromise("<p><%- include('/includedvar', { name: 'Bill' }) %></p>");
	t.is(await fn(), "<p>This is an Bill.</p>" );
});


// Markdown
test("Markdown", t => {
	t.is( (new TemplateRender( "md" )).getEngineName(), "md" );
});

test("Markdown Render: Parses base markdown, no data", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# My Title");
	t.is( (await fn()).trim(), "<h1>My Title</h1>" );
});

test("Markdown Render: Parses markdown using liquid engine (default, with data)", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# {{title}}");
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("Markdown Render: Parses markdown using ejs engine", async t => {
	let fn = await (new TemplateRender( "md" )).getCompiledTemplatePromise("# <%=title %>", {
		parseMarkdownWith: "ejs"
	});
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("Markdown Render: Set markdown engine to false, don’t parse", async t => {
	let fn = await ((new TemplateRender( "md" )).getCompiledTemplatePromise("# {{title}}", {
		parseMarkdownWith: false
	}));
	t.is( (await fn()).trim(), "<h1>{{title}}</h1>" );
});

test("Markdown Render: Change the default engine", async t => {
	let tr = new TemplateRender( "md" );
	tr.setDefaultMarkdownEngine("ejs");

	let fn = await (tr.getCompiledTemplatePromise("# <%= title %>"));
	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

test("Markdown Render: Change the default engine and pass in an override", async t => {
	let tr = new TemplateRender( "md" );
	tr.setDefaultMarkdownEngine("njk");

	let fn = await (tr.getCompiledTemplatePromise("# {{title}}", {
		parseMarkdownWith: "liquid"
	}));

	t.is( (await fn({title: "My Title"})).trim(), "<h1>My Title</h1>" );
});

// Handlebars
test("Handlebars", t => {
	t.is( (new TemplateRender( "hbs" )).getEngineName(), "hbs" );
});

test("Handlebars Render", async t => {
	let fn = await (new TemplateRender( "hbs" )).getCompiledTemplatePromise("<p>{{name}}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

test("Handlebars Render Partial", async t => {
	let fn = await (new TemplateRender( "hbs", "./test/stubs/" )).getCompiledTemplatePromise("<p>{{> included}}</p>");
	t.is( await fn(), "<p>This is an include.</p>" );
});

test("Handlebars Render Partial", async t => {
	let fn = await (new TemplateRender( "hbs", "./test/stubs/" )).getCompiledTemplatePromise("<p>{{> includedvar}}</p>");
	t.is( await fn({name: "Zach"}), "<p>This is a Zach.</p>" );
});

// Mustache
test("Mustache", async t => {
	t.is( (new TemplateRender( "mustache" )).getEngineName(), "mustache" );
});

test("Mustache Render", async t => {
	let fn = await (new TemplateRender( "mustache" )).getCompiledTemplatePromise("<p>{{name}}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

test("Mustache Render Partial", async t => {
	let fn = await (new TemplateRender( "mustache", "./test/stubs/" )).getCompiledTemplatePromise("<p>{{> included}}</p>");
	t.is( await fn(), "<p>This is an include.</p>" );
});

test("Mustache Render Partial", async t => {
	let fn = await (new TemplateRender( "mustache", "./test/stubs/" )).getCompiledTemplatePromise("<p>{{> includedvar}}</p>");
	t.is( await fn({name: "Zach"}), "<p>This is a Zach.</p>" );
});

// Haml
test("Haml", t => {
	t.is( (new TemplateRender( "haml" )).getEngineName(), "haml" );
});

test("Haml Render", async t => {
	let fn = await (new TemplateRender( "haml" )).getCompiledTemplatePromise("%p= name");
	t.is( (await fn({name: "Zach"})).trim(), "<p>Zach</p>" );
});

// Pug
test("Pug", t => {
	t.is( (new TemplateRender( "pug" )).getEngineName(), "pug" );
});

test("Pug Render", async t => {
	let fn = await (new TemplateRender( "pug" )).getCompiledTemplatePromise("p= name");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

test("Pug Render Include", async t => {
	let fn = await (new TemplateRender( "pug", "./test/stubs/" )).getCompiledTemplatePromise(`p
	include /included.pug`);
	t.is( await fn({name: "Zach"}), "<p><span>This is an include.</span></p>" );
});

test("Pug Render Include with Data", async t => {
	let fn = await (new TemplateRender( "pug", "./test/stubs/" )).getCompiledTemplatePromise(`p
	include /includedvar.pug`);
	t.is( await fn({name: "Zach"}), "<p><span>This is Zach.</span></p>" );
});

test("Pug Render Include with Data, inline var overrides data", async t => {
	let fn = await (new TemplateRender( "pug", "./test/stubs/" )).getCompiledTemplatePromise(`
- var name = "Bill";
p
	include /includedvar.pug`);
	t.is( await fn({name: "Zach"}), "<p><span>This is Bill.</span></p>" );
});

test("Pug Render Extends (Layouts)", async t => {
	let fn = await (new TemplateRender( "pug", "./test/stubs/" )).getCompiledTemplatePromise(`extends /layout.pug
block content
  h1= name`);
	t.is( await fn({name: "Zach"}), "<html><body><h1>Zach</h1></body></html>" );
});

// Nunjucks
test("Nunjucks", t => {
	t.is( (new TemplateRender( "njk" )).getEngineName(), "njk" );
});

test("Nunjucks Render", async t => {
	let fn = await (new TemplateRender( "njk" )).getCompiledTemplatePromise("<p>{{ name }}</p>");
	t.is( await fn({name: "Zach"}), "<p>Zach</p>" );
});

test("Nunjucks Render Extends", async t => {
	let fn = await (new TemplateRender( "njk", "test/stubs" )).getCompiledTemplatePromise("{% extends 'base.njk' %}{% block content %}This is a child.{% endblock %}");
	t.is( await fn(), "<p>This is a child.</p>" );
});

test("Nunjucks Render Include", async t => {
	let fn = await (new TemplateRender( "njk", "test/stubs" )).getCompiledTemplatePromise("<p>{% include 'included.njk' %}</p>");
	t.is( await fn(), "<p>This is an include.</p>" );
});

test("Nunjucks Render Imports", async t => {
	let fn = await (new TemplateRender( "njk", "test/stubs" )).getCompiledTemplatePromise("{% import 'imports.njk' as forms %}<div>{{ forms.label('Name') }}</div>");
	t.is( await fn(), "<div><label>Name</label></div>" );
});

test("Nunjucks Render Imports From", async t => {
	let fn = await (new TemplateRender( "njk", "test/stubs" )).getCompiledTemplatePromise("{% from 'imports.njk' import label %}<div>{{ label('Name') }}</div>");
	t.is( await fn(), "<div><label>Name</label></div>" );
});

// Liquid
test("Liquid", t => {
	t.is( (new TemplateRender( "liquid" )).getEngineName(), "liquid" );
});

test("Liquid Render", async t => {
	let fn = await (new TemplateRender( "liquid" )).getCompiledTemplatePromise("<p>{{name | capitalize}}</p>");
	t.is(await fn({name: "tim"}), "<p>Tim</p>" );
});

test("Liquid Render Include", async t => {
	t.is( (new TemplateRender( "liquid", "./test/stubs/" )).getEngineName(), "liquid" );

	let fn = await (new TemplateRender( "liquid_include_test.liquid", "./test/stubs/" )).getCompiledTemplatePromise("<p>{% include 'included' %}</p>");
	t.is(await fn(), "<p>This is an include.</p>" );
});