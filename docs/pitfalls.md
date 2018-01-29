# Common Eleventy Pitfalls

## Same Input and Output Dir with HTML Templates

<div id="same-input-output"></div>

If you’re using `--formats=html` and run eleventy more than once, it’ll try to process your output files too.

```
$ eleventy --input=. --output=. --formats=md,html
Writing ./README/index.html from ./README.md

$ eleventy --input=. --output=. --formats=md,html
Writing ./README/index.html from ./README.md
Writing ./README/index-o.html from ./README/index.html
```

If you’re going to use `--formats=html`, it’s probably best not using the same input and output directories.

Moreover, you may notice in the above output that the second template wrote to `index-o.html`. When the input and output directories are the same _and_ the source template is named `index.html`, we add an `-o` suffix to avoid overwriting itself. This is a special case that only applies to `index.html` filenames. You can customize the `-o` suffix with the `htmlOutputSuffix` configuration option.

## Eleventy processes things in my node_modules!

Eleventy, by default, ignores things in both your `.gitignore` and your `.eleventyignore` files. Usually `node_modules` is added to `.gitignore`, so you probably just haven’t done that yet in your project.

If, for some odd reason, you want to check your `node_modules` into your repository (but—why?), just add `node_modules` to your `.eleventyignore` file instead.
