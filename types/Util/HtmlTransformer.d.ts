export class HtmlTransformer {
    static prioritySort(a: any, b: any): 0 | 1 | -1;
    static _getPosthtmlInstance(callbacks?: any[], plugins?: any[], context?: {}): posthtml.PostHTML<any, any>;
    static transformStandalone(content: any, callback: any, posthtmlProcessOptions?: {}): Promise<string>;
    callbacks: {};
    posthtmlProcessOptions: {};
    plugins: any[];
    get aggregateBench(): any;
    setUserConfig(config: any): void;
    userConfig: any;
    _add(extensions: any, addType: any, value: any, options?: {}): void;
    addPosthtmlPlugin(extensions: any, plugin: any, options?: {}): void;
    addUrlTransform(extensions: any, callback: any, options?: {}): void;
    setPosthtmlProcessOptions(options: any): void;
    isTransformable(extension: any, context: any): boolean;
    getCallbacks(extension: any, context: any): any;
    getPlugins(extension: any): any;
    transformContent(outputPath: any, content: any, context: any): Promise<any>;
}
import posthtml from "posthtml";
