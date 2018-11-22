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
    let map = await template.getMapped();
    this.map.push(map);
    this.collection.add(map);
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

    await this.populateCollectionsDataInMap(this.collectionsData);

    this.taggedCollectionsData = await this.getTaggedCollectionsData();
    Object.assign(this.collectionsData, this.taggedCollectionsData);
    await this.populateUrlDataInMap(true);
    await this.populateCollectionsWithOutputPaths(this.collectionsData);

    this.userConfigCollectionsData = await this.getUserConfigCollectionsData();
    Object.assign(this.collectionsData, this.userConfigCollectionsData);

    await this.populateUrlDataInMap();
    // TODO this is repeated, unnecessary?
    await this.populateCollectionsWithOutputPaths(this.collectionsData);

    await this.populateContentDataInMap();
    this.populateCollectionsWithContent();
    this.cached = true;
  }

  getMapEntryForPath(inputPath) {
    for (let j = 0, k = this.map.length; j < k; j++) {
      // inputPath should be unique (even with pagination?)
      if (this.map[j].inputPath === inputPath) {
        return this.map[j];
      }
    }
  }

  getMapTemplateIndex(item) {
    let inputPath = item.inputPath;
    for (let j = 0, k = this.map.length; j < k; j++) {
      // inputPath should be unique (even with pagination?)
      if (this.map[j].inputPath === inputPath) {
        return j;
      }
    }

    return -1;
  }

  async populateCollectionsDataInMap(collectionsData) {
    for (let map of this.map) {
      // TODO these collections shouldn’t be passed around in a cached data object like this
      map.data.collections = collectionsData;
    }
  }

  async populateUrlDataInMap(skipPagination) {
    for (let map of this.map) {
      if (map._pages) {
        continue;
      }
      if (skipPagination && "pagination" in map.data) {
        continue;
      }

      let pages = await map.template.getTemplates(map.data);
      if (pages.length) {
        map._pages = pages;

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

  createTemplateMapCopy(filteredMap) {
    let copy = [];
    for (let map of filteredMap) {
      // let mapCopy = lodashClone(map);

      // TODO try this instead of lodash.clone
      let mapCopy = Object.assign({}, map);

      copy.push(mapCopy);
    }

    return copy;
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
    collections.all = this.createTemplateMapCopy(
      this.collection.getAllSorted()
    );
    debug(`Collection: collections.all size: ${collections.all.length}`);

    let tags = this.getAllTags();
    for (let tag of tags) {
      collections[tag] = this.createTemplateMapCopy(
        this.collection.getFilteredByTag(tag)
      );
      debug(`Collection: collections.${tag} size: ${collections[tag].length}`);
    }
    return collections;
  }

  setUserConfigCollections(configCollections) {
    return (this.configCollections = configCollections);
  }

  async getUserConfigCollectionsData() {
    let collections = {};
    let configCollections =
      this.configCollections || eleventyConfig.getCollections();
    for (let name in configCollections) {
      let ret = configCollections[name](this.collection);

      // work with arrays and strings returned from UserConfig.addCollection
      if (
        Array.isArray(ret) &&
        ret.length &&
        ret[0].inputPath &&
        ret[0].outputPath
      ) {
        collections[name] = this.createTemplateMapCopy(ret);
      } else {
        collections[name] = ret;
      }

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
