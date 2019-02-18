const isPlainObject = require("lodash/isPlainObject");
const DependencyGraph = require("dependency-graph").DepGraph;
const TemplateCollection = require("./TemplateCollection");
const eleventyConfig = require("./EleventyConfig");
const debug = require("debug")("Eleventy:TemplateMap");
const debugDev = require("debug")("Dev:Eleventy:TemplateMap");

class TemplateMap {
  constructor() {
    this.map = [];
    this.graph = new DependencyGraph();
    this.collectionsData = null;
    this.cached = false;
    this.configCollections = null;
  }

  async add(template) {
    for (let map of await template.getTemplateMapEntries()) {
      this.map.push(map);
    }
  }

  getMap() {
    return this.map;
  }

  get collection() {
    if (!this._collection) {
      this._collection = new TemplateCollection();
    }
    return this._collection;
  }

  getTagTarget(str) {
    if (str.startsWith("collections.")) {
      return str.substr("collections.".length);
    }
  }

  getPaginationTagTarget(entry) {
    if (entry.data.pagination && entry.data.pagination.data) {
      return this.getTagTarget(entry.data.pagination.data);
    }
  }

  getMappedDependencies() {
    let graph = new DependencyGraph();
    let tagPrefix = "___TAG___";

    graph.addNode(tagPrefix + "all");

    for (let entry of this.map) {
      let paginationTagTarget = this.getPaginationTagTarget(entry);
      if (paginationTagTarget) {
        if (this.isUserConfigCollectionName(paginationTagTarget)) {
          continue;
        } else {
          // using pagination but over a tagged collection
          graph.addNode(entry.inputPath);
          if (!graph.hasNode(tagPrefix + paginationTagTarget)) {
            graph.addNode(tagPrefix + paginationTagTarget);
          }
          graph.addDependency(entry.inputPath, tagPrefix + paginationTagTarget);
        }
      } else {
        // not using pagination
        graph.addNode(entry.inputPath);
      }

      // collections.all
      graph.addDependency(tagPrefix + "all", entry.inputPath);

      if (entry.data.tags) {
        for (let tag of entry.data.tags) {
          if (!graph.hasNode(tagPrefix + tag)) {
            graph.addNode(tagPrefix + tag);
          }
          // collections.tagName
          // console.log( "Dependency from", tagPrefix + tag, "to", entry.inputPath );
          graph.addDependency(tagPrefix + tag, entry.inputPath);
        }
      }
    }

    return graph.overallOrder();
  }

  getDelayedMappedDependencies() {
    let graph = new DependencyGraph();
    let tagPrefix = "___TAG___";

    graph.addNode(tagPrefix + "all");

    let userConfigCollections = this.getUserConfigCollectionNames();
    // Add tags from named user config collections
    for (let tag of userConfigCollections) {
      graph.addNode(tagPrefix + tag);
      // graph.addDependency( tagPrefix + tag, tagPrefix + "all" );
    }

    for (let entry of this.map) {
      let paginationTagTarget = this.getPaginationTagTarget(entry);
      if (
        paginationTagTarget &&
        this.isUserConfigCollectionName(paginationTagTarget)
      ) {
        if (!graph.hasNode(entry.inputPath)) {
          graph.addNode(entry.inputPath);
        }
        graph.addDependency(entry.inputPath, tagPrefix + paginationTagTarget);

        // collections.all
        graph.addDependency(tagPrefix + "all", entry.inputPath);

        if (entry.data.tags) {
          for (let tag of entry.data.tags) {
            if (!graph.hasNode(tagPrefix + tag)) {
              graph.addNode(tagPrefix + tag);
            }
            // collections.tagName
            // console.log( "Dependency from", tagPrefix + tag, "to", entry.inputPath );
            graph.addDependency(tagPrefix + tag, entry.inputPath);
          }
        }
      }
    }
    return graph.overallOrder();
  }

  async initDependencyMap(dependencyMap) {
    let tagPrefix = "___TAG___";
    for (let depEntry of dependencyMap) {
      if (depEntry.startsWith(tagPrefix)) {
        let tagName = depEntry.substr(tagPrefix.length);
        if (this.isUserConfigCollectionName(tagName)) {
          // async
          // console.log( "user config collection for", tagName );
          this.collectionsData[tagName] = await this.getUserConfigCollection(
            tagName
          );
        } else {
          // console.log( "data tagged collection for ", tagName );
          this.collectionsData[tagName] = this.getTaggedCollection(tagName);
        }
      } else {
        let map = this.getMapEntryForInputPath(depEntry);
        map._pages = await map.template.getTemplates(map.data);

        let counter = 0;
        for (let page of map._pages) {
          // TODO do we need this in map entries?
          if (!map.outputPath) {
            map.outputPath = page.outputPath;
          }
          if (
            counter === 0 ||
            (map.data.pagination &&
              map.data.pagination.addAllPagesToCollections)
          ) {
            this.collection.add(page);
          }
          counter++;
        }
      }
    }
  }

  async cache() {
    debug("Caching collections objects.");
    this.collectionsData = {};

    for (let entry of this.map) {
      entry.data.collections = this.collectionsData;
    }

    let dependencyMap = this.getMappedDependencies();
    // console.log( "dependency map:", dependencyMap );
    await this.initDependencyMap(dependencyMap);

    let delayedDependencyMap = this.getDelayedMappedDependencies();
    // console.log( "delayed dependency map:", delayedDependencyMap );
    await this.initDependencyMap(delayedDependencyMap);

    await this.populateContentDataInMap();
    this.populateCollectionsWithContent();
    this.cached = true;
  }

  getMapEntryForInputPath(inputPath) {
    for (let map of this.map) {
      if (map.inputPath === inputPath) {
        return map;
      }
    }
  }

  async populateContentDataInMap() {
    for (let map of this.map) {
      if (!map._pages) {
        throw new Error(`Content pages not found for ${map.inputPath}`);
      }
      for (let page of map._pages) {
        let content = await map.template.getTemplateMapContent(page);
        page.templateContent = content;

        // TODO is this necessary in map entries
        if (!map.templateContent) {
          map.templateContent = content;
        }
      }
      debugDev(
        "Added this.map[...].templateContent, outputPath, et al for one map entry"
      );
    }
  }

  _testGetAllTags() {
    let allTags = {};
    for (let map of this.map) {
      let tags = map.data.tags;
      if (Array.isArray(tags)) {
        for (let tag of tags) {
          allTags[tag] = true;
        }
      }
    }
    return Object.keys(allTags);
  }

  getTaggedCollection(tag) {
    let result;
    if (!tag || tag === "all") {
      result = this.collection.getAllSorted();
    } else {
      result = this.collection.getFilteredByTag(tag);
    }
    debug(`Collection: collections.${tag || "all"} size: ${result.length}`);

    return result;
  }

  async _testGetTaggedCollectionsData() {
    let collections = {};
    collections.all = this.collection.getAllSorted();
    debug(`Collection: collections.all size: ${collections.all.length}`);

    let tags = this._testGetAllTags();
    for (let tag of tags) {
      collections[tag] = this.collection.getFilteredByTag(tag);
      debug(`Collection: collections.${tag} size: ${collections[tag].length}`);
    }
    return collections;
  }

  setUserConfigCollections(configCollections) {
    return (this.configCollections = configCollections);
  }

  isUserConfigCollectionName(name) {
    let collections = this.configCollections || eleventyConfig.getCollections();
    return name && !!collections[name];
  }

  getUserConfigCollectionNames() {
    return Object.keys(
      this.configCollections || eleventyConfig.getCollections()
    );
  }

  async getUserConfigCollection(name) {
    let configCollections =
      this.configCollections || eleventyConfig.getCollections();

    // This works with async now
    let result = await configCollections[name](this.collection);

    debug(`Collection: collections.${name} size: ${result.length}`);
    return result;
  }

  async _testGetUserConfigCollectionsData() {
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
    let taggedCollections = await this._testGetTaggedCollectionsData();
    Object.assign(collections, taggedCollections);

    let userConfigCollections = await this._testGetUserConfigCollectionsData();
    Object.assign(collections, userConfigCollections);

    return collections;
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

        let entry = this.getMapEntryForInputPath(item.inputPath);
        let index = item.pageNumber || 0;
        item.templateContent = entry._pages[index].templateContent;
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
