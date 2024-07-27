export default TemplateConfig;
/**
 * :11ty/eleventy/TemplateConfig~TemplateConfig~config
 */
export type module = {
    /**
     * - The path prefix.
     */
    pathPrefix?: string | undefined;
};
/**
 * Config for a template.
 * @ignore
 * @param {{}} customRootConfig - tbd.
 * @param {String} projectConfigPath - Path to local project config.
 */
declare class TemplateConfig {
    constructor(customRootConfig: any, projectConfigPath: any);
    /** @type {object} - tbd. */
    overrides: object;
    projectConfigPaths: any[];
    /**
     * @type {object} - Custom root config.
     */
    customRootConfig: object;
    hasConfigMerged: boolean;
    isEsm: boolean;
    get userConfig(): UserConfig;
    get aggregateBenchmark(): any;
    setLogger(logger: any): void;
    logger: any;
    setDirectories(directories: any): void;
    directories: any;
    setTemplateFormats(templateFormats: any): void;
    get templateFormats(): any;
    get inputDir(): any;
    setRunMode(runMode: any): void;
    shouldSpiderJavaScriptDependencies(): boolean | undefined;
    /**
     * Normalises local project config file path.
     *
     * @method
     * @returns {String|undefined} - The normalised local project config file path.
     */
    getLocalProjectConfigFile(): string | undefined;
    getLocalProjectConfigFiles(): any;
    setProjectUsingEsm(isEsmProject: any): void;
    getIsProjectUsingEsm(): boolean;
    /**
     * Resets the configuration.
     */
    reset(): Promise<void>;
    /**
     * Resets the configuration while in watch mode.
     *
     * @todo Add implementation.
     */
    resetOnWatch(): void;
    hasInitialized(): boolean;
    /**
     * Async-friendly init method
     */
    init(overrides: any): Promise<void>;
    config: any;
    /**
     * Force a reload of the configuration object.
     */
    forceReloadConfig(): Promise<void>;
    /**
     * Returns the config object.
     *
     * @returns {{}} - The config object.
     */
    getConfig(): {};
    /**
     * Overwrites the config path.
     *
     * @param {String} path - The new config path.
     */
    setProjectConfigPath(path: string): Promise<void>;
    /**
     * Overwrites the path prefix.
     *
     * @param {String} pathPrefix - The new path prefix.
     */
    setPathPrefix(pathPrefix: string): void;
    /**
     * Gets the current path prefix denoting the root folder the output will be deployed to
     *
     *  @returns {String} - The path prefix string
     */
    getPathPrefix(): string;
    /**
     * Bootstraps the config object.
     */
    initializeRootConfig(): Promise<void>;
    rootConfig: any;
    appendToRootConfig(obj: any): void;
    processPlugins({ dir, pathPrefix }: {
        dir: any;
        pathPrefix: any;
    }): Promise<void>;
    /**
     * Fetches and executes the local configuration file
     *
     * @returns {Promise<object>} merged - The merged config file object.
     */
    requireLocalConfigFile(): Promise<object>;
    /**
     * Merges different config files together.
     *
     * @returns {Promise<object>} merged - The merged config file.
     */
    mergeConfig(): Promise<object>;
    get usesGraph(): GlobalDependencyMap;
    _usesGraph: GlobalDependencyMap | undefined;
    get uses(): GlobalDependencyMap;
    get existsCache(): ExistsCache;
    _existsCache: ExistsCache | undefined;
    #private;
}
import UserConfig from "./UserConfig.js";
import GlobalDependencyMap from "./GlobalDependencyMap.js";
import ExistsCache from "./Util/ExistsCache.js";
