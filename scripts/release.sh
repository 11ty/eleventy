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

if [ -z "$NPM_PUBLISH_TAG" ]; then
  echo 'Release error: missing NPM_PUBLISH_TAG environment variable'
	exit 1
fi


# Will skip publishing @11ty/client and @awesome.me/buildawesome if @11ty/eleventy fails
if npm stage publish --provenance --access=public --tag=$NPM_PUBLISH_TAG $DRY_RUN; then
	node packages/browser/update-package-json.js
	node packages/build-awesome/update-package-json.js
  npm stage publish --workspaces --provenance --access=public --tag=$NPM_PUBLISH_TAG $DRY_RUN
fi
