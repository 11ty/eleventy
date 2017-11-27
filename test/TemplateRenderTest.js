import test from "ava";
import ejs from "ejs";
import TemplateRender from "../src/TemplateRender";

// EJS
test(t => {
	t.is( (new TemplateRender( "default.ejs" )).parsed.ext, ".ejs" );

	t.is( (new TemplateRender()).getRenderFunction(), ejs.render );
	t.is( (new TemplateRender()).getRenderFunction()("<p><%= name %></p>", {name: "Zach"}), "<p>Zach</p>" );

	t.is( (new TemplateRender( "default.ejs" )).getRenderFunction(), ejs.render );
	t.is( (new TemplateRender( "default.ejs" )).getRenderFunction()("<p><%= name %></p>", {name: "Zach"}), "<p>Zach</p>" );
});

// Markdown
test(t => {
	t.is( (new TemplateRender( "markdown.md" )).parsed.ext, ".md" );
	t.is( (new TemplateRender( "markdown.md" )).getRenderFunction()("# Header"), "<h1>Header</h1>" );
});

// Handlebars
test(t => {
	t.is( (new TemplateRender( "handlebars.hbs" )).parsed.ext, ".hbs" );
	t.is( (new TemplateRender( "handlebars.hbs" )).getRenderFunction()("<p>{{name}}</p>", {name: "Zach"}), "<p>Zach</p>" );
});

// Mustache
test(t => {
	t.is( (new TemplateRender( "mustache.mustache" )).parsed.ext, ".mustache" );
	t.is( (new TemplateRender( "mustache.mustache" )).getRenderFunction()("<p>{{name}}</p>", {name: "Zach"}), "<p>Zach</p>" );
});

// Haml
test(t => {
	t.is( (new TemplateRender( "haml.haml" )).parsed.ext, ".haml" );
	t.is( (new TemplateRender( "haml.haml" )).getRenderFunction()("%p= name", {name: "Zach"}), "<p>Zach</p>" );
});

// Pug
test(t => {
	t.is( (new TemplateRender( "pug.pug" )).parsed.ext, ".pug" );
	t.is( (new TemplateRender( "pug.pug" )).getRenderFunction()("p= name", {name: "Zach"}), "<p>Zach</p>" );
});

// Nunjucks
test(t => {
	t.is( (new TemplateRender( "nunjucks.njk" )).parsed.ext, ".njk" );
	t.is( (new TemplateRender( "nunjucks.njk" )).getRenderFunction()("<p>{{ name }}</p>", {name: "Zach"}), "<p>Zach</p>" );
});