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

node packages/client/update-package-json.js

# Will skip publishing root if publishing workspaces fails
if npm publish --workspaces --provenance --access=public --tag=$NPM_PUBLISH_TAG $DRY_RUN; then
  npm publish --provenance --access=public --tag=$NPM_PUBLISH_TAG $DRY_RUN
fi
