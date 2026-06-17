if ! npm ci; then
	echo 'Release error: npm ci command failed.'
	exit 1
fi

if ! npx playwright install; then
	echo 'Release error: npx playwright install command failed (for Vitest Browser Mode).'
	exit 1
fi

# This step includes running packages/ test suites
if ! npm test; then
	echo 'Release error: npm test command failed.'
	exit 1
fi

if [ -z "$NPM_BUILDAWESOME_PUBLISH_TAG" ]; then
  echo 'Release error: missing NPM_BUILDAWESOME_PUBLISH_TAG environment variable'
	exit 1
fi

if [ -z "$NPM_ELEVENTY_PUBLISH_TAG" ]; then
  echo 'Release error: missing NPM_ELEVENTY_PUBLISH_TAG environment variable'
	exit 1
fi


# Will skip publishing @11ty/client and @awesome.me/buildawesome if @11ty/eleventy fails
# npm stage publish requires npm 11.15 or newer.
if npm stage publish --provenance --access=public --tag=$NPM_ELEVENTY_PUBLISH_TAG $DRY_RUN; then
	node packages/browser/update-package-json.js
  npm stage publish --workspace=packages/browser --provenance --access=public --tag=$NPM_ELEVENTY_PUBLISH_TAG $DRY_RUN
	node packages/build-awesome/update-package-json.js
  npm stage publish --workspace=packages/build-awesome --provenance --access=public --tag=$NPM_BUILDAWESOME_PUBLISH_TAG $DRY_RUN
fi
