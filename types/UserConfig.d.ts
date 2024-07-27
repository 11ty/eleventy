export default UserConfig;
/**
 * Eleventy’s user-land Configuration API
 * @module 11ty/eleventy/UserConfig
 */
declare class UserConfig {
    plugins: any[];
    templateFormatsAdded: any[];
    additionalWatchTargets: any[];
    extensionMap: Set<any>;
    dataExtensions: Map<any, any>;
    urlTransforms: any[];
    customDateParsingCallbacks: Set<any>;
    ignores: Set<any>;
    events: AsyncEventEmitter;
    /** @type {object} */
    directories: object;
    /** @type {undefined} */
    logger: undefined;
    /** @type {string} */
    dir: string;
    /** @type {string} */
    pathPrefix: string;
    _getUniqueId(): number | undefined;
    reset(): void;
    /** @type {BenchmarkManager} */
    benchmarkManager: BenchmarkManager | undefined;
    /** @type {object} */
    benchmarks: object;
    /** @type {object} */
    directoryAssignments: object;
    /** @type {object} */
    collections: object;
    /** @type {object} */
    precompiledCollections: object;
    templateFormats: any;
    /** @type {object} */
    universal: object;
    /** @type {object} */
    liquid: object;
    /** @type {object} */
    nunjucks: object;
    /** @type {object} */
    javascript: object;
    markdownHighlighter: any;
    /** @type {object} */
    libraryOverrides: object;
    /** @type {object} */
    passthroughCopies: object;
    /** @type {object} */
    layoutAliases: object;
    layoutResolution: boolean | undefined;
    /** @type {object} */
    linters: object;
    /** @type {object} */
    transforms: object;
    /** @type {object} */
    preprocessors: object;
    activeNamespace: any;
    DateTime: any;
    dynamicPermalinks: boolean | undefined;
    useGitIgnore: boolean | undefined;
    watchIgnores: Set<any> | undefined;
    dataDeepMerge: boolean | undefined;
    /** @type {object} */
    extensionConflictMap: object;
    watchJavaScriptDependencies: boolean | undefined;
    /** @type {object} */
    serverOptions: object;
    /** @type {object} */
    globalData: object;
    /** @type {object} */
    chokidarConfig: object;
    watchThrottleWaitTime: number | undefined;
    quietMode: boolean | undefined;
    useTemplateCache: boolean | undefined;
    dataFilterSelectors: Set<any> | undefined;
    /** @type {object} */
    libraryAmendments: object;
    serverPassthroughCopyBehavior: any;
    dataFileSuffixesOverride: any;
    dataFileDirBaseNameOverride: any;
    /** @type {object} */
    frontMatterParsingOptions: object;
    /** @type {object} */
    virtualTemplates: object;
    freezeReservedData: boolean | undefined;
    versionCheck(compatibleRange: any): void;
    on(eventName: any, callback: any): AsyncEventEmitter;
    emit(eventName: any, ...args: any[]): Promise<any[]>;
    getFilter(name: any): any;
    getFilters(options?: {}): any;
    getShortcode(name: any): any;
    getShortcodes(options?: {}): any;
    getPairedShortcode(name: any): any;
    getPairedShortcodes(options?: {}): any;
    addMarkdownHighlighter(highlightFn: any): void;
    addLiquidFilter(name: any, callback: any): void;
    addNunjucksAsyncFilter(name: any, callback: any): void;
    addNunjucksFilter(name: any, callback: any, isAsync?: boolean): void;
    addJavaScriptFilter(name: any, callback: any): void;
    addFilter(name: any, callback: any): void;
    addAsyncFilter(name: any, callback: any): void;
    addShortcode(name: any, callback: any): void;
    addAsyncShortcode(name: any, callback: any): void;
    addNunjucksAsyncShortcode(name: any, callback: any): void;
    addNunjucksShortcode(name: any, callback: any, isAsync?: boolean): void;
    addLiquidShortcode(name: any, callback: any): void;
    addPairedShortcode(name: any, callback: any): void;
    addPairedAsyncShortcode(name: any, callback: any): void;
    addPairedNunjucksAsyncShortcode(name: any, callback: any): void;
    addPairedNunjucksShortcode(name: any, callback: any, isAsync?: boolean): void;
    addPairedLiquidShortcode(name: any, callback: any): void;
    addJavaScriptShortcode(name: any, callback: any): void;
    addPairedJavaScriptShortcode(name: any, callback: any): void;
    addJavaScriptFunction(name: any, callback: any): void;
    addLiquidTag(name: any, tagFn: any): void;
    addNunjucksTag(name: any, tagFn: any): void;
    _enablePluginExecution(): void;
    _disablePluginExecution(): void;
    isPluginExecution(): boolean;
    /**
     * @typedef {function|Promise<function>|object} PluginDefinition
     * @property {Function} [configFunction]
     * @property {string} [eleventyPackage]
     * @property {object} [eleventyPluginOptions={}]
     * @property {boolean} [eleventyPluginOptions.unique]
     */
    /**
     * addPlugin: async friendly in 3.0
     *
     * @param {PluginDefinition} plugin
     */
    addPlugin(plugin: any, options?: {}): any;
    /** @param {string} name */
    resolvePlugin(name: string): any;
    /** @param {string|PluginDefinition} plugin */
    hasPlugin(plugin: string | any): boolean;
    /** @param {PluginDefinition} plugin */
    _getPluginName(plugin: any): any;
    _executePlugin(plugin: any, options: any): any;
    /** @param {string} name */
    getNamespacedName(name: string): string;
    namespace(pluginNamespace: any, callback: any): Promise<void>;
    /**
     * Adds a path to a file or directory to the list of pass-through copies
     * which are copied as-is to the output.
     *
     * @param {string|object} fileOrDir The path to the file or directory that should
     * be copied. OR an object where the key is the input glob and the property is the output directory
     * @param {object} copyOptions options for recursive-copy.
     * see https://www.npmjs.com/package/recursive-copy#arguments
     * default options are defined in TemplatePassthrough copyOptionsDefault
     * @returns {any} a reference to the `EleventyConfig` object.
     */
    addPassthroughCopy(fileOrDir: string | object, copyOptions?: object): any;
    _normalizeTemplateFormats(): void;
    setTemplateFormats(templateFormats: any): void;
    addTemplateFormats(templateFormats: any): void;
    setLibrary(engineName: any, libraryInstance: any): void;
    amendLibrary(engineName: any, callback: any): void;
    setLiquidOptions(options: any): void;
    setLiquidParameterParsing(behavior: any): void;
    setNunjucksEnvironmentOptions(options: any): void;
    setNunjucksPrecompiledTemplates(templates: any): void;
    setDynamicPermalinks(enabled: any): void;
    setUseGitIgnore(enabled: any): void;
    setDataDeepMerge(deepMerge: any): void;
    isDataDeepMergeModified(): boolean;
    addWatchTarget(additionalWatchTargets: any): void;
    setWatchJavaScriptDependencies(watchEnabled: any): void;
    setServerOptions(options?: {}, override?: boolean): void;
    setBrowserSyncConfig(): void;
    _attemptedBrowserSyncUse: boolean | undefined;
    setChokidarConfig(options?: {}): void;
    setWatchThrottleWaitTime(time?: number): void;
    setFrontMatterParsingOptions(options?: {}): void;
    _setQuietModeOverride(quietMode: any): void;
    setQuietMode(quietMode: any): void;
    addExtension(fileExtension: any, options?: {}): void;
    addDataExtension(extensionList: any, parser: any): void;
    setUseTemplateCache(bypass: any): void;
    setPrecompiledCollections(collections: any): void;
    setServerPassthroughCopyBehavior(behavior: any): void;
    addUrlTransform(callback: any): void;
    setDataFileSuffixes(suffixArray: any): void;
    setDataFileBaseName(baseName: any): void;
    addTemplate(virtualInputPath: any, content: any, data: any): void;
    isVirtualTemplate(virtualInputPath: any): boolean;
    setInputDirectory(dir: any): void;
    setOutputDirectory(dir: any): void;
    setDataDirectory(dir: any): void;
    setIncludesDirectory(dir: any): void;
    setLayoutsDirectory(dir: any): void;
    setFreezeReservedData(bool: any): void;
    addDateParsing(callback: any): void;
    addGlobalData(name: any, data: any): this;
    addNunjucksGlobal(name: any, globalType: any): void;
    addTransform(name: any, callback: any): void;
    addPreprocessor(name: any, fileExtensions: any, callback: any): void;
    addLinter(name: any, callback: any): void;
    addLayoutAlias(from: any, to: any): void;
    setLayoutResolution(resolution: any): void;
    enableLayoutResolution(): void;
    getCollections(): any;
    addCollection(name: any, callback: any): void;
    augmentFunctionContext(fn: any, options: any): (this: any, ...args: any[]) => any;
    getMergingConfigObject(): {
        transforms: any;
        linters: any;
        preprocessors: any;
        globalData: any;
        layoutAliases: any;
        layoutResolution: boolean | undefined;
        passthroughCopies: any;
        liquidOptions: any;
        liquidTags: any;
        liquidFilters: any;
        liquidShortcodes: any;
        liquidPairedShortcodes: any;
        liquidParameterParsing: any;
        nunjucksEnvironmentOptions: any;
        nunjucksPrecompiledTemplates: any;
        nunjucksFilters: any;
        nunjucksAsyncFilters: any;
        nunjucksTags: any;
        nunjucksGlobals: any;
        nunjucksAsyncShortcodes: any;
        nunjucksShortcodes: any;
        nunjucksAsyncPairedShortcodes: any;
        nunjucksPairedShortcodes: any;
        javascriptFunctions: any;
        javascriptShortcodes: any;
        javascriptPairedShortcodes: any;
        javascriptFilters: any;
        markdownHighlighter: any;
        libraryOverrides: any;
        dynamicPermalinks: boolean | undefined;
        useGitIgnore: boolean | undefined;
        ignores: Set<any>;
        watchIgnores: Set<any> | undefined;
        dataDeepMerge: boolean | undefined;
        watchJavaScriptDependencies: boolean | undefined;
        additionalWatchTargets: any[];
        serverOptions: any;
        chokidarConfig: any;
        watchThrottleWaitTime: number | undefined;
        frontMatterParsingOptions: any;
        dataExtensions: Map<any, any>;
        extensionMap: Set<any>;
        quietMode: boolean | undefined;
        events: AsyncEventEmitter;
        benchmarkManager: BenchmarkManager | undefined;
        plugins: any[];
        useTemplateCache: boolean | undefined;
        precompiledCollections: any;
        dataFilterSelectors: Set<any> | undefined;
        libraryAmendments: any;
        serverPassthroughCopyBehavior: any;
        urlTransforms: any[];
        virtualTemplates: any;
        freezeReservedData: boolean | undefined;
        customDateParsing: Set<any>;
    };
    addHandlebarsHelper(): void;
    setPugOptions(): void;
    setEjsOptions(): void;
    addHandlebarsShortcode(): void;
    addPairedHandlebarsShortcode(): void;
    #private;
}
import AsyncEventEmitter from "./Util/AsyncEventEmitter.js";
import BenchmarkManager from "./Benchmark/BenchmarkManager.js";
