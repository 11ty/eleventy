const lodashCloneDeep = require("lodash.clonedeep");
const Template = require("./Template");
const TemplateCollection = require("./TemplateCollection");
const eleventyConfig = require("./EleventyConfig");
const debug = require("debug")("Eleventy:TemplateMap");

class TemplateMap {
  constructor() {
    this.map = [];
    this.collection = new TemplateCollection();
    this.collectionsData = null;
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
    this.collectionsData = await this.getAllCollectionsData();
    await this.populateDataInMap();
    this.populateCollectionsWithContent();
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

  async populateDataInMap() {
    for (let map of this.map) {
      map.data.collections = await this.getCollectionsDataForTemplate(
        map.template
      );
    }
    debug("Added this.map[...].data.collections");

    for (let map of this.map) {
      map.template.setWrapWithLayouts(false);
      map.templateContent = await map.template.getFinalContent(map.data);
      map.template.setWrapWithLayouts(true);
    }
    debug("Added this.map[...].templateContent");
  }

  async createTemplateMapCopy(filteredMap) {
    let copy = [];
    for (let map of filteredMap) {
      let mapCopy = lodashCloneDeep(map);

      // Circular reference
      delete mapCopy.data.collections;

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
      } else if (tags) {
        allTags[tags] = true;
      }
    }
    return Object.keys(allTags);
  }

  async getAllCollectionsData() {
    let collections = {};
    collections.all = await this.createTemplateMapCopy(
      this.collection.getAllSorted()
    );
    debug(`Collection: collections.all has ${collections.all.length} items.`);

    let tags = this.getAllTags();
    for (let tag of tags) {
      collections[tag] = await this.createTemplateMapCopy(
        this.collection.getFilteredByTag(tag)
      );
      debug(
        `Collection: collections.${tag} has ${collections[tag].length} items.`
      );
    }

    let configCollections = eleventyConfig.getCollections();
    for (let name in configCollections) {
      collections[name] = await this.createTemplateMapCopy(
        configCollections[name](this.collection)
      );
      debug(
        `Collection: collections.${name} has ${collections[name].length} items.`
      );
    }

    return collections;
  }

  populateCollectionsWithContent() {
    for (let collectionName in this.collectionsData) {
      for (let item of this.collectionsData[collectionName]) {
        let index = this.getMapTemplateIndex(item);
        if (index !== -1) {
          item.templateContent = this.map[index].templateContent;
        }
      }
    }
  }

  async getCollectionsDataForTemplate(template) {
    if (!this.collectionsData) {
      await this.cache();
    }

    return this.collectionsData;
  }
}

module.exports = TemplateMap;
