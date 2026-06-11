export NPM_PUBLISH_TAG="canary"
export DRY_RUN="--dry-run" # leave that space as-is

echo "Publishing: @11ty/eleventy, @11ty/client, @awesome.me/buildawesome publish (dry run)"

./scripts/release.sh
