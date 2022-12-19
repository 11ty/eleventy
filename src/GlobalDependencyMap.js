const { DepGraph } = require("dependency-graph");
const { TemplatePath } = require("@11ty/eleventy-utils");

const PathNormalizer = require("./Util/PathNormalizer");
const eventBus = require("./EventBus.js");

// TODO extend this to built-in template types, this is only used by Custom templates for now

class GlobalDependencyMap {
  // URL object with a windows, with file:// already removed (from file:///C:/directory/ to /C:/directory/)
  static WINDOWS_DRIVE_URL_PATH = /^\/\w\:\//;

  static LAYOUT_KEY = "layout";
  static COLLECTION_KEY = "collection";

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

  delete(node) {
    node = this.normalizeNode(node);

    if (this.map.hasNode(node)) {
      this.map.removeNode(node);
    }
  }

  // Layouts are not relevant to compile cache and can be ignored
  getDependencies(node, includeLayouts = true) {
    node = this.normalizeNode(node);
    // console.log( node, this.map.overallOrder() );
    // console.log( node, this.map.size(), this.map.dependenciesOf(node), this.map.dependantsOf(node) );

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
    // TODO clear out irrelevant old relationships
    // note that this is called for both layouts and by Custom compile->addDependencies

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

  getCollectionKey(entry) {
    return `${GlobalDependencyMap.COLLECTION_KEY}:${entry}`;
  }

  addDependencyConsumesCollection(from, collectionName) {
    this._addDependency(this.normalizeNode(from), [
      this.getCollectionKey(collectionName),
    ]);
  }

  addDependencyPublishesToCollection(from, collectionName) {
    let normalizedFrom = this.normalizeNode(from);
    this._addDependency(this.getCollectionKey(collectionName), [
      normalizedFrom,
    ]);
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
