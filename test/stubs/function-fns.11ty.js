module.exports = function({ avaTest }) {
  avaTest.truthy(this.url);
  avaTest.truthy(this.slug);
  avaTest.truthy(this.log);
  avaTest.truthy(this.getPreviousCollectionItem);
  avaTest.truthy(this.getNextCollectionItem);
  avaTest.truthy(this.page);

  return "test";
};
