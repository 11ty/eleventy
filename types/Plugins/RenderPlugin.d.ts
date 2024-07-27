export default eleventyRenderPlugin;
/**
 * @module 11ty/eleventy/Plugins/RenderPlugin
 */
/**
 * A plugin to add shortcodes to render an Eleventy template
 * string (or file) inside of another template. {@link https://www.11ty.dev/docs/plugins/render/}
 *
 * @since 1.0.0
 * @param {module:11ty/eleventy/UserConfig} eleventyConfig - User-land configuration instance.
 * @param {object} options - Plugin options
 */
declare function eleventyRenderPlugin(eleventyConfig: any, options?: object): void;
declare namespace eleventyRenderPlugin {
    let eleventyPackage: string;
    namespace eleventyPluginOptions {
        let unique: boolean;
    }
}
declare function compileFile(inputPath: any, options: {} | undefined, templateLang: any): Promise<any>;
/** @this {object} */
declare function compile(this: any, content: any, templateLang: any, options?: {}): Promise<any>;
export class RenderManager {
    templateConfig: TemplateConfig;
    init(): Promise<any>;
    config(callback: any): any;
    get initialGlobalData(): TemplateDataInitialGlobalData;
    _data: TemplateDataInitialGlobalData | undefined;
    getData(...data: any[]): Promise<any>;
    compile(content: any, templateLang: any, options?: {}): Promise<any>;
    render(fn: any, edgeData: any, buildTimeData: any): Promise<any>;
    #private;
}
import TemplateConfig from "../TemplateConfig.js";
import TemplateDataInitialGlobalData from "../Data/TemplateDataInitialGlobalData.js";
export { compileFile as File, compile as String };
