export default eleventyHtmlBasePlugin;
export { transformUrl as applyBaseToUrl };
declare function eleventyHtmlBasePlugin(eleventyConfig: any, defaultOptions?: {}): void;
declare namespace eleventyHtmlBasePlugin {
    let eleventyPackage: string;
    namespace eleventyPluginOptions {
        let unique: boolean;
    }
}
declare function transformUrl(url: any, base: any, opts?: {}): any;
