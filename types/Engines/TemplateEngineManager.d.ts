export default TemplateEngineManager;
declare class TemplateEngineManager {
    static isAlias(entry: any): boolean;
    static isSimpleAlias(entry: any): boolean;
    constructor(eleventyConfig: any);
    eleventyConfig: any;
    engineCache: {};
    importCache: {};
    get config(): any;
    get keyToClassNameMap(): {
        md: string;
        html: string;
        njk: string;
        liquid: string;
        "11ty.js": string;
    };
    _keyToClassNameMap: {
        md: string;
        html: string;
        njk: string;
        liquid: string;
        "11ty.js": string;
    } | undefined;
    reset(): void;
    getClassNameFromTemplateKey(key: any): any;
    hasEngine(name: any): boolean;
    isEngineRemovedFromCore(name: any): boolean;
    getEngineClassByExtension(extension: any): Promise<any>;
    getCustomEngineClass(): Promise<any>;
    _CustomEngine: Promise<any> | undefined;
    getEngine(name: any, extensionMap: any): Promise<any>;
    #private;
}
