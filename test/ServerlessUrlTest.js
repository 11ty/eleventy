const test = require("ava");
const ServerlessUrl = require("../src/Filters/ServerlessUrl");

test("serverlessUrl Stringify", (t) => {
  // Straight string
  t.is(ServerlessUrl("/test/"), "/test/");

  // Has data param but doesn’t use it
  t.is(ServerlessUrl("/test/", { id: 1 }), "/test/");

  // Has data param and does use it
  t.is(ServerlessUrl("/test/:id/", { id: 1 }), "/test/1/");

  // Throws error when it needs a data param
  t.throws(() => ServerlessUrl("/test/:id/", {}));
});

test("serverlessUrl Stringify Arrays", (t) => {
  // Straight string
  t.deepEqual(ServerlessUrl(["/test/", "/testb/"]), ["/test/", "/testb/"]);

  // Has data param but doesn’t use it
  t.deepEqual(ServerlessUrl(["/test/", "/testb/"], { id: 1 }), [
    "/test/",
    "/testb/",
  ]);

  // Has data param and does use it
  t.deepEqual(ServerlessUrl(["/test/:id/", "/testb/:id/"], { id: 1 }), [
    "/test/1/",
    "/testb/1/",
  ]);

  // Throws error when it needs a data param
  t.throws(() => ServerlessUrl(["/test/:id/", "/testb/:id/"], {}));
});
