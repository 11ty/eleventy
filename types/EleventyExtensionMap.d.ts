export default EleventyExtensionMap;
declare class EleventyExtensionMap {
    constructor(config: any);
    set config(cfg: any);
    get config(): any;
    _spiderJsDepsCache: {};
    /** @type {Array} */
    validTemplateLanguageKeys: any[];
    setFormats(formatKeys?: any[]): void;
    formatKeys: any[] | undefined;
    unfilteredFormatKeys: any[] | undefined;
    passthroughCopyKeys: any[] | undefined;
    eleventyConfig: any;
    get engineManager(): TemplateEngineManager;
    _engineManager: TemplateEngineManager | undefined;
    reset(): void;
    getFileList(path: any, dir: any): any[];
    isFullTemplateFilePath(path: any): boolean;
    getCustomExtensionEntry(extension: any): any;
    getValidExtensionsForPath(path: any): any[];
    shouldSpiderJavaScriptDependencies(path: any): Promise<any>;
    getPassthroughCopyGlobs(inputDir: any): string[];
    getValidGlobs(inputDir: any): string[];
    getGlobs(inputDir: any): string[];
    _getGlobs(formatKeys: any, inputDir: any): string[];
    hasExtension(key: any): boolean;
    getExtensionsFromKey(key: any): any[];
    getExtensionEntriesFromKey(key: any): any[];
    hasEngine(pathOrKey: any): boolean;
    getKey(pathOrKey: any): any;
    getExtensionEntry(pathOrKey: any): any;
    removeTemplateExtension(path: any): any;
    get extensionToKeyMap(): {
        md: {
            key: string;
            extension: string;
        };
        html: {
            key: string;
            extension: string;
        };
        njk: {
            key: string;
            extension: string;
        };
        liquid: {
            key: string;
            extension: string;
        };
        "11ty.js": {
            key: string;
            extension: string;
        };
        "11ty.cjs": {
            key: string;
            extension: string;
        };
        "11ty.mjs": {
            key: string;
            extension: string;
        };
    };
    _extensionToKeyMap: {
        md: {
            key: string;
            extension: string;
        };
        html: {
            key: string;
            extension: string;
        };
        njk: {
            key: string;
            extension: string;
        };
        liquid: {
            key: string;
            extension: string;
        };
        "11ty.js": {
            key: string;
            extension: string;
        };
        "11ty.cjs": {
            key: string;
            extension: string;
        };
        "11ty.mjs": {
            key: string;
            extension: string;
        };
    } | undefined;
    getReadableFileExtensions(): string;
}
import TemplateEngineManager from "./Engines/TemplateEngineManager.js";
