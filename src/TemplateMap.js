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
    this.tags = [];
  }

  async add(template) {
    this.map.push(await template.getMapped());
  }

  getMap() {
    return this.map;
  }

  cache() {
    this.populateCollection();
    this.tags = this.getAllTags();
    this.collectionsData = this.getAllCollectionsData();
  }

  populateCollection() {
    this.collection = new TemplateCollection();
    for (let map of this.map) {
      this.collection.add(map);
    }
  }

  createTemplateMapCopy(filteredMap) {
    let copy = [];
    for (let map of filteredMap) {
      let mapCopy = lodashCloneDeep(map);

      // For simplification, maybe re-add this later?
      // delete mapCopy.template;
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

  getAllCollectionsData() {
    let collections = {};
    collections.all = this.createTemplateMapCopy(
      this.collection.getAllSorted()
    );
    debug(`Collection: collections.all has ${collections.all.length} items.`);

    for (let tag of this.tags) {
      collections[tag] = this.createTemplateMapCopy(
        this.collection.getFilteredByTag(tag)
      );
      debug(
        `Collection: collections.${tag} has ${collections[tag].length} items.`
      );
    }

    let configCollections = eleventyConfig.getCollections();
    for (let name in configCollections) {
      collections[name] = this.createTemplateMapCopy(
        configCollections[name](this.collection)
      );
      debug(
        `Collection: collections.${name} has ${collections[name].length} items.`
      );
    }

    // console.log( "collections>>>>", collections );
    // console.log( ">>>>> end collections" );

    return collections;
  }

  async assignActiveTemplate(activeTemplate) {
    if (activeTemplate) {
      for (let collectionName in this.collectionsData) {
        for (let item of this.collectionsData[collectionName]) {
          // Assign active keys for all templates (both true and false)
          item.active = await item.template.isEqual(activeTemplate);
        }
      }
    }
  }

  async getCollectionsDataForTemplate(template) {
    if (!this.collectionsData) {
      this.cache();
    }

    await this.assignActiveTemplate(template);

    return this.collectionsData;
  }
}

module.exports = TemplateMap;
