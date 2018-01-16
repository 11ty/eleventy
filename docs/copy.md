# Pass-through File Copy

_New in Eleventy v0.2.7._ Eleventy, by default, searches for any file in the input directory with an extension listed in the `templateFormats` configuration option. That means if you’ve listed `njk` in your `templateFormats`, we’ll look for any Nunjucks templates (files with the `.njk` file extension).

If you list a format in the `templateFormats` array that isn’t a valid template, it’ll throw an error. Enabling `passthroughFileCopy` in your configuration changes this behavior. Setting `passthroughFileCopy: true` will copy unknown files directly to your output directory without modification.

```
// .eleventy.js
module.exports = {
  templateFormats: [
    "md",
    "png"
  ],
  passthroughFileCopy: true
};
```

Although `png` is not a recognized Eleventy template, Eleventy will now search for any `*.png` files inside of the input directory and copy them to output (keeping directory structure).
