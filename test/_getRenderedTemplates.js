async function getRenderedTemplates(template, data) {
  let pages = await template.getTemplates(data);
  await Promise.all(
    pages.map(async (page) => {
      let content = await renderTemplate(page.template, page.data);

      page.templateContent = content;
    })
  );
  return pages;
}

async function renderLayout(tmpl, tmplData) {
	let layoutKey = tmplData[tmpl.config.keys.layout];
	let layout = tmpl.getLayout(layoutKey);
	let content = await tmpl.renderWithoutLayout(tmplData);
	return layout.render(tmplData, content);
}

async function renderTemplate(tmpl, tmplData) {
	if (!tmplData) {
		throw new Error("`tmplData` needs to be passed into render()");
	}

	if (tmplData[tmpl.config.keys.layout]) {
		return renderLayout(tmpl, tmplData);
	} else {
		return tmpl.renderWithoutLayout(tmplData);
	}
}

export {
	getRenderedTemplates,
	renderLayout,
	renderTemplate,
};
