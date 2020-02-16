module.exports = function getCollectionItem(collection, page, modifier = 0) {
  let j = 0;
  let index;
  for (let item of collection) {
    if (
      item.inputPath === page.inputPath &&
      item.outputPath === page.outputPath
    ) {
      index = j;
      break;
    }
    j++;
  }

  if (index !== undefined && collection && collection.length) {
    if (index + modifier >= 0 && index + modifier < collection.length) {
      return collection[index + modifier];
    }
  }
};
