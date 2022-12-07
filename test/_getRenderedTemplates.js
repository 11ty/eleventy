module.exports = async function getRenderedTemplates(template, data) {
  let pages = await template.getTemplates(data);
  await Promise.all(
    pages.map(async (page) => {
      let content = await page.template.render(page.data);

      page.templateContent = content;
    })
  );
  return pages;
};
