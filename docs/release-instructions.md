# Dependency notes

- `@iarna/toml` has a 3.0 that we have never been on but it was released the same day as the last 2.x https://github.com/BinaryMuse/toml-node/commits/master (needs more investigation)

## List of dependencies that went ESM

- `@sindresorhus/slugify` ESM at 2.x
- `multimatch` is ESM at 6
- `bcp-47-normalize` at 1.x

# Release Procedure

1. (Optional) Update minor dependencies in package.json
   - `npx npm-check-updates`
   - or `npm outdated` + `npm update --save`
1. If the minimum Node version changed, make sure you update `package.json` engines property.
   - Make sure the error message works correctly for Node versions less than 10.
     - 0.12.x+ requires Node 10+
     - 1.x+ requires Node 12+
     - 2.x+ requires Node 14+
1. `rm -rf node_modules && rm -f package-lock.json && npm install`
1. `npm audit`
1. Make sure `npx ava` runs okay
1. Update version in `package.json`
   - (Alpha) Use `-alpha.1` suffix
   - (Beta) Use `-beta.1` suffix
1. Run `npm run coverage`
1. Check it all in and commit
1. Tag new version
1. Wait for GitHub Actions to complete to know that the build did not fail.
1. Release
   - (Alpha) `npm publish --access=public --tag=canary`
     - NOTE: this was changed to `alpha` https://github.com/11ty/eleventy/issues/2758
   - (Beta) `npm publish --access=public --tag=beta`
   - (Main) `npm publish --access=public`
1. (Optional) Build and commit a new the `eleventy-edge-cdn` project to generate a new Eleventy Edge lib.

Unfortunate note about npm and tags (specifically `canary` here): if you push a 1.0.0-canary.x to `canary` (even though `2.0.0-canary.x` exists), it will use the last pushed tag when you npm install from `@canary` (not the highest version number)

# Docs/Website (Main releases only)

1. Maybe search for `-alpha.` (`-canary.`?) or `-beta.` in the docs copy to update to the stable release, if applicable.
1. Check in a new `11ty-website` site with updated `package.json` version.
1. Add version to `11ty-website` `versions.json`
1. Commit it
1. Create a new branch for branched version
1. (Main) Check out the previous version git branch and add `outdated: true` to `_data/config.json` and commit/push.
1. Go to https://app.netlify.com/sites/11ty/settings/domain and set up a subdomain for it.

# Release Notes on GitHub (Main releases only)

1. Draft a new release on GitHub
1. Fetch OpenCollective usernames for release notes https://www.11ty.dev/supporters-for-release-notes/

# Extras

1. Update `eleventy-base-blog`?
