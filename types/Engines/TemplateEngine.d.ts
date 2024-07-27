export default TemplateEngine;
declare class TemplateEngine {
    static shouldSpiderJavaScriptDependencies(): boolean;
    constructor(name: any, eleventyConfig: any);
    name: any;
    engineLib: any;
    cacheable: boolean;
    eleventyConfig: any;
    get dirs(): any;
    get inputDir(): any;
    get includesDir(): any;
    get config(): any;
    get benchmarks(): {
        aggregate: any;
    };
    _benchmarks: {
        aggregate: any;
    } | undefined;
    set engineManager(manager: any);
    get engineManager(): any;
    _engineManager: any;
    set extensionMap(map: any);
    get extensionMap(): any;
    _extensionMap: any;
    get extensions(): any;
    _extensions: any;
    get extensionEntries(): any;
    _extensionEntries: any;
    getName(): any;
    getIncludesDir(): any;
    /**
     * @protected
     */
    protected setEngineLib(engineLib: any): void;
    getEngineLib(): any;
    _testRender(str: any, data: any): Promise<any>;
    needsToReadFileContents(): boolean;
    getExtraDataFromFile(): {};
    getCompileCacheKey(str: any, inputPath: any): {
        useCache: boolean;
        key: any;
    };
    get defaultTemplateFileExtension(): string;
    useLayouts(): boolean;
    /** @returns {boolean|undefined} */
    permalinkNeedsCompilation(str: any): boolean | undefined;
    needsCompilation(str: any): boolean;
    /**
     * Make sure compile is implemented downstream.
     * @abstract
     * @return {Promise}
     */
    compile(): Promise<any>;
    hasDependencies(inputPath: any): boolean;
    isFileRelevantTo(inputPath: any, comparisonFile: any): any;
}
