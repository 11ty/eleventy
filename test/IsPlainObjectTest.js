const test = require("ava");
const isPlainObject = require("../src/Util/IsPlainObject");

test("isPlainObject", (t) => {
  t.is(isPlainObject(null), false);
  t.is(isPlainObject(undefined), false);
  t.is(isPlainObject(1), false);
  t.is(isPlainObject(true), false);
  t.is(isPlainObject(false), false);
  t.is(isPlainObject("string"), false);
  t.is(isPlainObject([]), false);
  t.is(isPlainObject(Symbol("a")), false);
  t.is(
    isPlainObject(function () {}),
    false
  );
});

// https://github.com/lodash/lodash/blob/ddfd9b11a0126db2302cb70ec9973b66baec0975/test/test.js#L11447
// Notably, did not include the test for DOM Elements.
test("Test from lodash.isPlainObject", (t) => {
  t.is(isPlainObject({}), true);
  t.is(isPlainObject({ a: 1 }), true);

  function Foo(a) {
    this.a = 1;
  }

  t.is(isPlainObject({ constructor: Foo }), true);
  t.is(isPlainObject([1, 2, 3]), false);
  t.is(isPlainObject(new Foo(1)), false);
});

test("Test from lodash.isPlainObject: should return `true` for objects with a `[[Prototype]]` of `null`", (t) => {
  let obj = Object.create(null);
  t.is(isPlainObject(obj), true);

  obj.constructor = Object.prototype.constructor;
  t.is(isPlainObject(obj), true);
});

test("Test from lodash.isPlainObject: should return `true` for objects with a `valueOf` property", (t) => {
  t.is(isPlainObject({ valueOf: 0 }), true);
});

test("Test from lodash.isPlainObject: should return `true` for objects with a writable `Symbol.toStringTag` property", (t) => {
  let obj = {};
  obj[Symbol.toStringTag] = "X";

  t.is(isPlainObject(obj), true);
});

test("Test from lodash.isPlainObject: should return `false` for objects with a custom `[[Prototype]]`", (t) => {
  let obj = Object.create({ a: 1 });
  t.is(isPlainObject(obj), false);
});

test("Test from lodash.isPlainObject (modified): should return `false` for non-Object objects", (t) => {
  t.is(isPlainObject(arguments), true); // WARNING: lodash was false
  t.is(isPlainObject(Error), false);
  t.is(isPlainObject(Math), true); // WARNING: lodash was false
});

test("Test from lodash.isPlainObject: should return `false` for non-objects", (t) => {
  t.is(isPlainObject(true), false);
  t.is(isPlainObject("a"), false);
  t.is(isPlainObject(Symbol("a")), false);
});

test("Test from lodash.isPlainObject (modified): should return `true` for objects with a read-only `Symbol.toStringTag` property", (t) => {
  var object = {};
  Object.defineProperty(object, Symbol.toStringTag, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: "X",
  });

  t.is(isPlainObject(object), true); // WARNING: lodash was false
});
