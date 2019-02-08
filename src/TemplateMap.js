const isPlainObject = require("lodash/isPlainObject");
const TemplateCollection = require("./TemplateCollection");
const eleventyConfig = require("./EleventyConfig");
const debug = require("debug")("Eleventy:TemplateMap");
const debugDev = require("debug")("Dev:Eleventy:TemplateMap");

class TemplateMap {
  constructor() {
    this.map = [];
    this.collection = new TemplateCollection();
    this.collectionsData = null;
    this.cached = false;
    this.configCollections = null;
  }

  async add(template) {
    for (let map of await template.getMappedTemplates()) {
      this.map.push(map);
      this.collection.add(map);
    }
  }

  getMap() {
    return this.map;
  }

  getCollection() {
    return this.collection;
  }

  async cache() {
    debug("Caching collections objects.");
    this.collectionsData = {};

    for (let entry of this.map) {
      entry.data.collections = this.collectionsData;
    }

    this.taggedCollectionsData = await this.getTaggedCollectionsData();
    Object.assign(this.collectionsData, this.taggedCollectionsData);

    // see .isSafe for definition of safe versus unsafe
    await this.getSafeTemplatePages();
    await this.populateUrlDataInMapSafe();
    // TODO all tests pass when this is commented out (repeated below)
    // Is this missing a test? Making a user config collection using `outputPath` or `url`?
    await this.populateCollectionsWithOutputPaths(this.collectionsData);

    this.userConfigCollectionsData = await this.getUserConfigCollectionsData();
    Object.assign(this.collectionsData, this.userConfigCollectionsData);

    await this.getUnsafeTemplatePages();
    await this.populateUrlDataInMapUnsafe();
    await this.populateCollectionsWithOutputPaths(this.collectionsData);

    await this.populateContentDataInMap();
    this.populateCollectionsWithContent();
    this.cached = true;
  }

  _testGetMapEntryForPath(inputPath, pageIndex = 0) {
    for (let j = 0, k = this.map.length; j < k; j++) {
      // inputPath should be unique (even with pagination?)
      if (
        this.map[j].inputPath === inputPath &&
        this.map[j].pageIndex === pageIndex
      ) {
        return this.map[j];
      }
    }
  }

  getMapTemplateIndex(item) {
    let inputPath = item.inputPath;
    let pageIndex = item.pageIndex || 0;
    for (let j = 0, k = this.map.length; j < k; j++) {
      // inputPath should be unique (even with pagination?)
      if (
        this.map[j].inputPath === inputPath &&
        this.map[j].pageIndex === pageIndex
      ) {
        return j;
      }
    }

    return -1;
  }

  isPaginationUsingUserConfigCollection(entry) {
    if (!("pagination" in entry.data) || !("data" in entry.data.pagination)) {
      return false;
    }

    let target = entry.data.pagination.data;
    let collectionNames = this.getUserConfigCollectionNames();
    for (let name of collectionNames) {
      if (`collections.${name}` === target.trim()) {
        return true;
      }
    }
    return false;
  }

  // safe templates are paginated templates targeting a user configured collection
  isSafe(entry) {
    if (!("pagination" in entry.data)) {
      return true;
    }
    if (!this.isPaginationUsingUserConfigCollection(entry)) {
      return true;
    }
    return false;
  }

  async getSafeTemplatePages() {
    return this._getTemplatePages(true);
  }
  async getUnsafeTemplatePages() {
    return this._getTemplatePages(false);
  }
  async _getTemplatePages(safeTemplatesOnly) {
    for (let map of this.map) {
      if (!safeTemplatesOnly || this.isSafe(map)) {
        map._pages = await map.template.getTemplates(map.data);
      }
    }
  }

  async populateUrlDataInMapSafe() {
    return this._populateUrlDataInMap(true);
  }
  async populateUrlDataInMapUnsafe() {
    return this._populateUrlDataInMap(false);
  }
  async _populateUrlDataInMap(safeTemplatesOnly) {
    for (let map of this.map) {
      if ((!safeTemplatesOnly || this.isSafe(map)) && map._pages) {
        Object.assign(
          map,
          await map.template.getSecondaryMapEntry(map._pages[0])
        );
      }
    }
  }

  async populateContentDataInMap() {
    for (let map of this.map) {
      if (map._pages) {
        Object.assign(
          map,
          await map.template.getTertiaryMapEntry(map._pages[0])
        );
        debugDev(
          "Added this.map[...].templateContent, outputPath, et al for one map entry"
        );
      }
    }
  }

  getAllTags() {
    let allTags = {};
    for (let map of this.map) {
      let tags = map.data.tags;
      if (Array.isArray(tags)) {
        for (let tag of tags) {
          allTags[tag] = true;
        }
        // This branch should no longer be necessary per TemplateContent.cleanupFrontMatterData
      } else if (tags) {
        allTags[tags] = true;
      }
    }
    return Object.keys(allTags);
  }

  async getTaggedCollectionsData() {
    let collections = {};
    collections.all = this.collection.getAllSorted();
    debug(`Collection: collections.all size: ${collections.all.length}`);

    let tags = this.getAllTags();
    for (let tag of tags) {
      collections[tag] = this.collection.getFilteredByTag(tag);
      debug(`Collection: collections.${tag} size: ${collections[tag].length}`);
    }
    return collections;
  }

  setUserConfigCollections(configCollections) {
    return (this.configCollections = configCollections);
  }

  getUserConfigCollectionNames() {
    return Object.keys(
      this.configCollections || eleventyConfig.getCollections()
    );
  }

  async getUserConfigCollectionsData() {
    let collections = {};
    let configCollections =
      this.configCollections || eleventyConfig.getCollections();

    for (let name in configCollections) {
      collections[name] = configCollections[name](this.collection);

      debug(
        `Collection: collections.${name} size: ${collections[name].length}`
      );
    }

    return collections;
  }

  async _testGetAllCollectionsData() {
    let collections = {};
    let taggedCollections = await this.getTaggedCollectionsData();
    Object.assign(collections, taggedCollections);

    let userConfigCollections = await this.getUserConfigCollectionsData();
    Object.assign(collections, userConfigCollections);

    return collections;
  }

  populateCollectionsWithOutputPaths(collections) {
    for (let collectionName in collections) {
      if (!Array.isArray(this.collectionsData[collectionName])) {
        continue;
      }

      for (let item of collections[collectionName]) {
        if (!isPlainObject(item) || !("inputPath" in item)) {
          continue;
        }

        let index = this.getMapTemplateIndex(item);
        if (index !== -1) {
          item.outputPath = this.map[index].outputPath;
          item.url = this.map[index].url;
        }
      }
    }
  }

  populateCollectionsWithContent() {
    for (let collectionName in this.collectionsData) {
      if (!Array.isArray(this.collectionsData[collectionName])) {
        continue;
      }

      for (let item of this.collectionsData[collectionName]) {
        if (!isPlainObject(item) || !("inputPath" in item)) {
          continue;
        }

        let index = this.getMapTemplateIndex(item);
        if (index !== -1) {
          item.templateContent = this.map[index].templateContent;
        }
      }
    }
  }

  async getCollectionsData() {
    if (!this.cached) {
      await this.cache();
    }

    return this.collectionsData;
  }
}

module.exports = TemplateMap;
