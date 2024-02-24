// TODO locale-friendly, see GetLocaleCollectionItem.js)
export default function getCollectionItemIndex(collection, page) {
	if (!page) {
		page = this.page;
	}

	let j = 0;
	for (const item of collection) {
		if (
			item.inputPath === page.inputPath &&
			(item.outputPath === page.outputPath || item.url === page.url)
		) {
			return j;
		}
		j++;
	}
}
