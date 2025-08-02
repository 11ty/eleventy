export NPM_PUBLISH_TAG="canary"
export DRY_RUN="--dry-run" # leave that space as-is

echo "Running @11ty/eleventy and @11ty/client publish dry run test"

./scripts/release.sh
