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
	let content = await tmpl.renderPageEntryWithoutLayout({
		rawInput: await tmpl.getPreRender(),
		data: tmplData
	});

	return layout.renderPageEntry({
		data: tmplData,
		templateContent: content,
	});
}

async function renderLayoutViaLayout(layout, tmplData, templateContent) {
	return layout.renderPageEntry({
		data: tmplData,
		templateContent,
	});
}

async function renderTemplate(tmpl, tmplData) {
	if (!tmplData) {
		throw new Error("`tmplData` needs to be passed into render()");
	}

	if (tmplData[tmpl.config.keys.layout]) {
		return renderLayout(tmpl, tmplData);
	} else {
		return tmpl.renderPageEntryWithoutLayout({
			rawInput: await tmpl.getPreRender(),
			data: tmplData
		});
	}
}

export {
	getRenderedTemplates,
	renderLayoutViaLayout,
	renderLayout,
	renderTemplate,
};
