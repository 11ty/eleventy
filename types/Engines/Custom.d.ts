export default CustomEngine;
declare class CustomEngine extends TemplateEngine {
    static shouldSpiderJavaScriptDependencies(entry: any): any;
    entry: any;
    needsInit: boolean;
    _defaultEngine: any;
    cacheable: any;
    getExtensionMapEntry(): any;
    setDefaultEngine(defaultEngine: any): void;
    /**
     * @override
     */
    override needsToReadFileContents(): any;
    _runningInit(): Promise<void>;
    _initBench: any;
    _initing: any;
    getExtraDataFromFile(inputPath: any): Promise<any>;
    compile(str: any, inputPath: any, ...args: any[]): Promise<any>;
    get defaultTemplateFileExtension(): any;
    useLayouts(): any;
    isFileRelevantTo(inputPath: any, comparisonFile: any, includeLayouts: any): any;
    permalinkNeedsCompilation(): any;
}
import TemplateEngine from "./TemplateEngine.js";
