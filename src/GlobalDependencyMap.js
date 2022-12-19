const { DepGraph } = require("dependency-graph");
const { TemplatePath } = require("@11ty/eleventy-utils");

const PathNormalizer = require("./Util/PathNormalizer.js");
const eventBus = require("./EventBus.js");

class GlobalDependencyMap {
  // dependency-graph requires these keys to be alphabetic strings
  static LAYOUT_KEY = "layout";
  static COLLECTION_KEY = "__collection:";

  // URL object with a windows, with file:// already removed (from file:///C:/directory/ to /C:/directory/)
  static WINDOWS_DRIVE_URL_PATH = /^\/\w\:\//;

  constructor() {
    eventBus.on("eleventy.compileCacheReset", () => {
      this._map = undefined;
    });
  }

  setConfig(config) {
    if (this.config) {
      return;
    }

    this.config = config;

    // These have leading dot slashes, but so do the paths from Eleventy
    this.config.events.once("eleventy.layouts", (layouts) => {
      this.addLayoutsToMap(layouts);
    });
  }

  removeAllLayoutNodes() {
    let nodes = this.map.overallOrder();
    for (let node of nodes) {
      let data = this.map.getNodeData(node);
      if (!data || !data.type || data.type !== GlobalDependencyMap.LAYOUT_KEY) {
        continue;
      }

      this.map.removeNode(node);
    }
  }

  // Eleventy Layouts don’t show up in the dependency graph, so we handle those separately
  addLayoutsToMap(layouts) {
    // Clear out any previous layout relationships to make way for the new ones
    this.removeAllLayoutNodes();

    for (let rawLayout in layouts) {
      let layout = this.normalizeNode(rawLayout);

      // We add this pre-emptively to add the `layout` data
      if (!this.map.hasNode(layout)) {
        this.map.addNode(layout, {
          type: GlobalDependencyMap.LAYOUT_KEY,
        });
      }

      for (let pageTemplate of layouts[rawLayout]) {
        this.addDependency(pageTemplate, [layout]);
      }
    }
  }

  get map() {
    if (!this._map) {
      this._map = new DepGraph({ circular: true });
    }

    return this._map;
  }

  normalizeNode(node) {
    if (!node) {
      return;
    }

    // TODO tests for this
    // Fix URL objects passed in (sass does this)
    if (typeof node !== "string" && "toString" in node) {
      node = node.toString();
    }

    // Fix file:///Users/ or file:///C:/ paths passed in
    if (node.startsWith("file://")) {
      node = node.slice("file://".length);
      if (node.match(GlobalDependencyMap.WINDOWS_DRIVE_URL_PATH)) {
        node = node.slice(1); // take off the leading slash, /C:/ becomes C:/
      }
    }

    if (typeof node !== "string") {
      throw new Error(
        "`addDependencies` files must be strings. Received:" + node
      );
    }

    // Paths should not be absolute (we convert absolute paths to relative)
    // Paths should not have a leading dot slash
    // Paths should always be `/` independent of OS path separator
    return TemplatePath.stripLeadingDotSlash(
      PathNormalizer.normalizeSeperator(TemplatePath.relativePath(node))
    );
  }

  getRelationships(node) {
    let relationships = {
      dependants: new Set(),
      dependencies: new Set(),
    };

    if (!node) {
      return relationships;
    }

    node = this.normalizeNode(node);

    if (!this.map.hasNode(node)) {
      return relationships;
    }

    // Direct dependants and dependencies, both publish and consume from collections
    relationships.dependants = new Set(
      this.map
        .directDependantsOf(node)
        .map((entry) => GlobalDependencyMap.getEntryFromCollectionKey(entry))
    );
    relationships.dependencies = new Set(
      this.map
        .directDependenciesOf(node)
        .map((entry) => GlobalDependencyMap.getEntryFromCollectionKey(entry))
    );

    return relationships;
  }

  resetNode(node) {
    node = this.normalizeNode(node);

    if (!this.map.hasNode(node)) {
      return;
    }

    for (let dep of this.map.directDependantsOf(node)) {
      this.map.removeDependency(dep, node);
    }
    for (let dep of this.map.directDependenciesOf(node)) {
      this.map.removeDependency(node, dep);
    }
  }

  getTemplatesThatConsumeCollections(collectionNames) {
    let templates = new Set();
    for (let name of collectionNames) {
      for (let node of this.map.dependantsOf(
        GlobalDependencyMap.getCollectionKeyForEntry(name)
      )) {
        if (!node.startsWith(GlobalDependencyMap.COLLECTION_KEY)) {
          templates.add(node);
        }
      }
    }
    return templates;
  }

  // Layouts are not relevant to compile cache and can be ignored
  getDependencies(node, includeLayouts = true) {
    node = this.normalizeNode(node);

    // `false` means the Node was unknown
    if (!this.map.hasNode(node)) {
      return false;
    }

    return this.map.dependenciesOf(node).filter((node) => {
      if (includeLayouts) {
        return true;
      }

      // filter out layouts
      let data = this.map.getNodeData(node);
      if (data && data.type) {
        if (data.type === "layout") {
          return false;
        }
      }
      return true;
    });
  }

  // node arguments are already normalized
  _addDependency(from, toArray = []) {
    this.map.addNode(from);

    if (!Array.isArray(toArray)) {
      throw new Error("Second argument to `addDependency` must be an Array.");
    }

    for (let to of toArray) {
      if (!this.map.hasNode(to)) {
        this.map.addNode(to);
      }
      if (from !== to) {
        this.map.addDependency(from, to);
      }
    }
  }

  addDependency(from, toArray = []) {
    this._addDependency(
      this.normalizeNode(from),
      toArray.map((to) => this.normalizeNode(to))
    );
  }

  static getEntryFromCollectionKey(entry) {
    return entry.slice(GlobalDependencyMap.COLLECTION_KEY.length);
  }

  static getCollectionKeyForEntry(entry) {
    return `${GlobalDependencyMap.COLLECTION_KEY}${entry}`;
  }

  addDependencyConsumesCollection(from, collectionName) {
    this._addDependency(this.normalizeNode(from), [
      GlobalDependencyMap.getCollectionKeyForEntry(collectionName),
    ]);
  }

  addDependencyPublishesToCollection(from, collectionName) {
    let normalizedFrom = this.normalizeNode(from);
    this._addDependency(
      GlobalDependencyMap.getCollectionKeyForEntry(collectionName),
      [normalizedFrom]
    );
  }

  // Layouts are not relevant to compile cache and can be ignored
  hasDependency(from, to, includeLayouts) {
    to = this.normalizeNode(to);

    let deps = this.getDependencies(from, includeLayouts); // normalizes `from`

    if (!deps) {
      return false;
    }

    return deps.includes(to);
  }

  // Layouts are not relevant to compile cache and can be ignored
  isFileRelevantTo(fullTemplateInputPath, comparisonFile, includeLayouts) {
    fullTemplateInputPath = this.normalizeNode(fullTemplateInputPath);
    comparisonFile = this.normalizeNode(comparisonFile);

    // No watch/serve changed file
    if (!comparisonFile) {
      return false;
    }

    // The file that changed is the relevant file
    if (fullTemplateInputPath === comparisonFile) {
      return true;
    }

    // The file that changed is a dependency of the template
    if (
      this.hasDependency(fullTemplateInputPath, comparisonFile, includeLayouts)
    ) {
      return true;
    }

    return false;
  }
}

module.exports = GlobalDependencyMap;
