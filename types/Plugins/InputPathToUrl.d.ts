export default TransformPlugin;
export function TransformPlugin(eleventyConfig: any, defaultOptions?: {}): void;
export namespace TransformPlugin {
    let eleventyPackage: string;
    namespace eleventyPluginOptions {
        let unique: boolean;
    }
}
export function FilterPlugin(eleventyConfig: any): void;
export namespace FilterPlugin {
    let eleventyPackage_1: string;
    export { eleventyPackage_1 as eleventyPackage };
    export namespace eleventyPluginOptions_1 {
        let unique_1: boolean;
        export { unique_1 as unique };
    }
    export { eleventyPluginOptions_1 as eleventyPluginOptions };
}
