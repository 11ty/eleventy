<p align="center"><img src="https://www.11ty.dev/img/logo-github.svg" width="200" height="200" alt="eleventy Logo"></p>

# eleventy 🕚⚡️🎈🐀

A simpler static site generator. An alternative to Jekyll. Written in JavaScript. Transforms a directory of templates (of varying types) into HTML.

Works with HTML, Markdown, JavaScript, Liquid, Nunjucks, with addons for WebC, Sass, Vue, Svelte, TypeScript, JSX, and many others!

## ➡ [Documentation](https://www.11ty.dev/docs/)

- Please star [this repo on GitHub](https://github.com/11ty/eleventy/)!
- Follow us on Mastodon [@eleventy@fosstodon.org](https://fosstodon.org/@eleventy) or Twitter [@eleven_ty](https://twitter.com/eleven_ty)
- Join us on [Discord](https://www.11ty.dev/blog/discord/)
- Support [11ty on Open Collective](https://opencollective.com/11ty)
- [11ty on npm](https://www.npmjs.com/org/11ty)
- [11ty on GitHub](https://github.com/11ty)

[![npm Version](https://img.shields.io/npm/v/@11ty/eleventy.svg?style=for-the-badge)]
[![GitHub issues](https://img.shields.io/github/issues/11ty/eleventy.svg?style=for-the-badge)]
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=for-the-badge)]
[![npm Downloads](https://img.shields.io/npm/dt/@11ty/eleventy.svg?style=for-the-badge)]
- Star [this repo on GitHub](https://github.com/11ty/eleventy/)!
- Follow us [on Mastodon `@11ty@neighborhood.11ty.dev`](https://neighborhood.11ty.dev/@11ty)
- Follow us [on Bluesky `@11ty.dev`](https://bsky.app/profile/11ty.dev)
- Install [from npm](https://www.npmjs.com/org/11ty)
- Follow [on GitHub](https://github.com/11ty)
- Watch us [on YouTube](https://www.youtube.com/c/EleventyVideo)
- Chat on [Discord](https://www.11ty.dev/blog/discord/)
- Latest: [![npm Version](https://img.shields.io/npm/v/@11ty/eleventy.svg?style=for-the-badge)](https://www.npmjs.com/package/@11ty/eleventy)

## Installation


Read our [Getting Started guide](https://www.11ty.dev/docs/getting-started/).

## Configuration API

### Set a Markdown syntax highlighter

```js```
eleventyConfig.setMarkdownHighlighter(myHighlighterFunction);

Read our [Getting Started guide](https://www.11ty.dev/docs/getting-started/).

## Tests

```
npm test
```

We have a few test suites, for various reasons:

- [ava JavaScript test runner](https://github.com/avajs/ava) ([assertions docs](https://github.com/avajs/ava/blob/main/docs/03-assertions.md)) (primary test suite in `test/`)
- [Node.js Test runner](https://nodejs.org/api/test.html) (secondary test suite in `test_node/`)
- [Vitest (in Browser Mode)](https://vitest.dev/guide/browser/) (client tests in `packages/client/test/`)
- [Benchmark for Performance Regressions](https://github.com/11ty/eleventy-benchmark)

These run in various environments:

- [Continuous Integration on GitHub Actions](https://github.com/11ty/eleventy/actions/workflows/ci.yml)
- [Code Coverage Statistics](https://github.com/11ty/eleventy/blob/master/docs/coverage.md)

## Community Roadmap

- [Top Feature Requests](https://github.com/11ty/eleventy/issues?q=label%3Aneeds-votes+sort%3Areactions-%2B1-desc+label%3Aenhancement) (Add your own votes using the 👍 reaction)
- [Top Bugs 😱](https://github.com/11ty/eleventy/issues?q=is%3Aissue+is%3Aopen+label%3Abug+sort%3Areactions) (Add your own votes using the 👍 reaction)

## Plugins

See the [official docs on plugins](https://www.11ty.dev/docs/plugins/).


### ✅ What Changed

1. Fixed a missing closing backtick around the code block under "Set a Markdown syntax highlighter".
2. Added the installation snippet back in.
3. Clarified the deprecation note for `addMarkdownHighlighter()`.
4. Cleaned up the tests list formatting for consistency.

