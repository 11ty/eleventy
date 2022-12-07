const test = require("ava");
const checkPassthroughCopyBehavior = require("../src/Util/PassthroughCopyBehaviorCheck");

test("Standard use", (t) => {
  t.is(
    checkPassthroughCopyBehavior(
      {
        serverPassthroughCopyBehavior: "passthrough",
        serverOptions: {},
      },
      "serve"
    ),
    true
  );
});

test("Config fallback", (t) => {
  t.is(
    checkPassthroughCopyBehavior(
      {
        serverPassthroughCopyBehavior: "copy",
        serverOptions: {},
      },
      "serve"
    ),
    false
  );
});

test("Other dev server", (t) => {
  t.is(
    checkPassthroughCopyBehavior(
      {
        serverPassthroughCopyBehavior: "passthrough",
        serverOptions: {
          module: "somethingelse",
        },
      },
      "serve"
    ),
    false
  );
});

test("Non --serve run modes", (t) => {
  t.is(
    checkPassthroughCopyBehavior(
      {
        serverPassthroughCopyBehavior: "passthrough",
        serverOptions: {},
      },
      "watch"
    ),
    false
  );

  t.is(
    checkPassthroughCopyBehavior(
      {
        serverPassthroughCopyBehavior: "passthrough",
        serverOptions: {},
      },
      "build"
    ),
    false
  );
});
