const test = require("ava");
const { ProxyWrap } = require("../src/Util/ProxyWrap.js");

test("Basic wrap", (t) => {
  let test = ProxyWrap({}, { a: 1 });
  t.is(test.a, 1);
});

test("Nested wrap", (t) => {
  let test = ProxyWrap({}, { child: { a: 1, b: 1 } });
  t.truthy(test.child);
  t.deepEqual(test.child, { a: 1, b: 1 });
  t.deepEqual(test.child.a, 1);
  t.deepEqual(test.child.b, 1);
});

test("Double nested wrap", (t) => {
  let child = {
    a: 1,
    b: 1,
    c: {
      grandchild: 1,
    },
  };
  let test = ProxyWrap(
    {},
    {
      child,
    }
  );
  t.truthy(test.child);
  t.deepEqual(test.child, child);
  t.deepEqual(test.child.a, 1);
  t.deepEqual(test.child.b, 1);
  t.deepEqual(test.child.c.grandchild, 1);
});

test("Array", (t) => {
  let test = ProxyWrap({}, { child: [1, 2, 3] });
  t.deepEqual(test.child, [1, 2, 3]);
  t.deepEqual(test.child[1], 2);
});

test("Array nested", (t) => {
  let test = ProxyWrap({}, { child: [1, [2], 3] });
  t.deepEqual(test.child, [1, [2], 3]);
  t.deepEqual(test.child[1], [2]);
  t.deepEqual(test.child[1][0], 2);
});
