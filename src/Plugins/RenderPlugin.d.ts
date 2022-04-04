/**
 * A plugin to add shortcodes to render an Eleventy template
 * string (or file) inside of another template.
 *
 * @link [Official docs](https://www.11ty.dev/docs/plugins/render/)
 * @category plugins
 * @since 1.0.0
 */
declare function EleventyPlugin(
  eleventyConfig: any,
  options?: {
    /**
     * The shortcode name to render a string.
     * @default "renderTemplate"
     */
    tagName?: string

    /**
     * The shortcode name to render a file.
     * @default "renderFile"
     */
    tagNameFile?: string
  }
): void;

export = EleventyPlugin;
