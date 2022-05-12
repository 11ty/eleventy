# Dependency notes

- `@iarna/toml` has a 3.0 that we have never been on but it was released the same day as the last 2.x https://github.com/BinaryMuse/toml-node/commits/master (needs more investigation)

## List of dependencies that went ESM

- `@sindresorhus/slugify` ESM at 2.x
- `multimatch` is ESM at 6

# Canary Release Procedure

1. npmclean aka `rm -rf node_modules && rm -f package-lock.json && npm install`
1. Make sure `npx ava` runs okay
1. Update version in `package.json`, include `-canary.1` suffix
1. Check it all in and commit
1. Tag new version
1. `npm publish --access=public --tag=canary`
1. Use the `eleventy-edge-cdn` project to generate a new Eleventy Edge lib

Unfortunate thing about npm: if you push a 1.0.0-canary.x to `canary` after a `2.0.0-canary.x`, it will use the last pushed tag (not the highest version number)

# Beta Release Procedure

1. update minor dependencies in package.json?
1. npmclean aka `rm -rf node_modules && rm -f package-lock.json && npm install`
1. npm audit
1. Make sure `npx ava` runs okay
1. Update version in `package.json`, include `-beta.1` suffix
1. Run `npm run coverage`
1. Check it all in and commit
1. Tag new version
1. `npm publish --access=public --tag=beta`
1. Use the `eleventy-edge-cdn` project to generate a new Eleventy Edge lib

# Release Procedure

1. update minor dependencies in package.json? `npm outdated` `npm update --save`
1. npmclean aka `rm -rf node_modules && rm -f package-lock.json && npm install`
1. If the minimum Node version changed, make sure you update `package.json` engines property.
1. Bonus: make sure the error message works correctly for Node versions less than 10.

- 0.12.x+ requires Node 10+
- 1.x+ requires Node 12+
- 2.x+ requires Node 14+

1. npm audit
1. Make sure `npx ava` runs okay
1. Update version in `package.json`
1. Run `npm run coverage`
1. Check it all in and commit
1. Tag new version
1. `npm publish --access=public`
1. Use the `eleventy-edge-cdn` project to generate a new Eleventy Edge lib

## If Docs branch does not yet exist

1. Check in a new `11ty-website` site with updated `package.json` version.
1. Add version to 11ty-website `versions.json`
1. Commit it
1. Create a new branch for branched version
1. Go to https://app.netlify.com/sites/11ty/settings/domain and set up a subdomain for it.

### Always:

1. Check out the previous version git branch and add `outdated: true` to `_data/config.json` and commit/push.
2. Update `eleventy-base-blog`?

---

## If Branch docs already exist, 11ty-website (unlikely, I don’t do this any more)

1. Check to make sure `"prerelease": false` in `_data/config.json`
2. Check to make sure `"prerelease": true` does not exist in current version in `_data/versions.json`
3. Merge branch to master.
