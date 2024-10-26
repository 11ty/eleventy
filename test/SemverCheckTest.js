import test from "ava";
import semver from "semver";

test("Satisfies sanity checks with beta/canary", (t) => {
  t.true(
    semver.satisfies("1.0.0-beta.1", ">= 0.7.0", {
      includePrerelease: true,
    }),
    "1.0 Beta is valid for 0.x"
  );

  t.true(
    semver.satisfies("1.0.0-canary.1", ">= 0.7.0", {
      includePrerelease: true,
    }),
    "1.0 Canary is valid for 0.x"
  );

  t.true(
    semver.satisfies("1.0.0-beta.1", ">= 0.7.0", {
      includePrerelease: true,
    }),
    "1.0 Beta is valid for 0.x"
  );

  t.true(
    semver.satisfies("1.0.0", ">= 0.7.0", {
      includePrerelease: true,
    }),
    "1.0 is valid for 0.x"
  );

  // keep canary around, it won’t have the `includePrerelease` option in `UserConfig->versionCheck`
  t.true(
    semver.satisfies("1.0.0", ">=0.7 || >=1.0.0-canary", {
      includePrerelease: true,
    })
  );
  t.true(
    semver.satisfies("1.0.0-beta.1", ">=0.7 || >=1.0.0-canary", {
      includePrerelease: true,
    })
  );
  t.true(
    semver.satisfies("1.0.0-canary.1", ">=0.7 || >=1.0.0-canary", {
      includePrerelease: true,
    })
  );
});
