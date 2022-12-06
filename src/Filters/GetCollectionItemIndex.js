module.exports = function getCollectionItemIndex(collection, page) {
  if (!page) {
    page = this.page || this.ctx?.page || this.context?.environments?.page;
  }

  let j = 0;
  for (let item of collection) {
    if (
      item.inputPath === page.inputPath &&
      (item.outputPath === page.outputPath || item.url === page.url)
    ) {
      return j;
    }
    j++;
  }
};
