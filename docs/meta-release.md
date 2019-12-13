# Beta Release Procedure

1. update minor dependencies in package.json?
1. npmclean
1. npm audit
1. Update version in `package.json`, include `-beta.1` suffix
1. Run `npm run coverage`
1. Check it all in and commit
1. Tag new version
1. `npm publish --access=public --tag=beta`

# Release Procedure

1. update minor dependencies in package.json? `npm outdated` `npm update --save`
1. npmclean first
1. npm audit
1. Update version in `package.json`
1. Run `npm run coverage`
1. Check it all in and commit
1. Tag new version
1. `npm publish --access=public`

## If branch docs do not exist

1. Make sure `localDev: false` in `config.js`
1. Check in a new `11ty.io` site with updated `package.json` version.
1. Add version to 11ty.io `versions.json`
1. Commit it
1. Run ./deploy.sh to push to production branch for 11ty.io
1. Create a new branch for branched version
1. Go to https://app.netlify.com/sites/11ty/settings/domain and set up a subdomain for it.

### Always:

1. Check out the previous version git branch and add `outdated: true` to `_data/config.json` and commit/push.
2. Update `eleventy-base-blog`?

---

## If Branch docs already exist, 11ty.io (unlikely, I don’t do this any more)

1. Check to make sure `"prerelease": false` in `_data/config.json`
2. Check to make sure `"prerelease": true` does not exist in current version in `_data/versions.json`
3. Merge branch to master.
