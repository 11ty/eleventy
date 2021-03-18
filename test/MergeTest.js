const test = require("ava");
const Merge = require("../src/Util/Merge");

test("Shallow Merge", (t) => {
  t.deepEqual(Merge({}, {}), {});
  t.deepEqual(Merge({ a: 1 }, { a: 2 }), { a: 2 });
  t.deepEqual(Merge({ a: 1 }, { a: 2 }, { a: 3 }), { a: 3 });

  t.deepEqual(Merge({ a: 1 }, { b: 1 }), { a: 1, b: 1 });
  t.deepEqual(Merge({ a: 1 }, { b: 1 }, { c: 1 }), { a: 1, b: 1, c: 1 });

  t.deepEqual(Merge({ a: [1] }, { a: [2] }), { a: [1, 2] });
});

test("Doesn’t need to return", (t) => {
  var b = { a: 2 };
  Merge(b, { a: 1 });
  t.deepEqual(b, { a: 1 });
});

test("Invalid", (t) => {
  t.deepEqual(Merge({}, 1), {});
  t.deepEqual(Merge({}, [1]), {});
  t.deepEqual(Merge({}, "string"), {});
});

test("Deep", (t) => {
  t.deepEqual(Merge({ a: { b: 1 } }, { a: { c: 1 } }), { a: { b: 1, c: 1 } });
});

test("Deep, override: prefix", (t) => {
  t.deepEqual(Merge({ a: { b: [1, 2] } }, { a: { b: [3, 4] } }), {
    a: { b: [1, 2, 3, 4] },
  });
  t.deepEqual(Merge({ a: [1] }, { a: [2] }), { a: [1, 2] });
  t.deepEqual(Merge({ a: [1] }, { "override:a": [2] }), { a: [2] });
  t.deepEqual(Merge({ a: { b: [1, 2] } }, { a: { "override:b": [3, 4] } }), {
    a: { b: [3, 4] },
  });
});

test("Deep, override: prefix at root", (t) => {
  t.deepEqual(Merge({ "override:a": [1] }, { a: [2] }), { a: [1, 2] });
});

test("Deep, override: prefix at other placements", (t) => {
  t.deepEqual(
    Merge(
      {
        a: {
          a: [1],
        },
      },
      {
        a: {
          a: [2],
        },
      }
    ),
    {
      a: {
        a: [1, 2],
      },
    }
  );

  t.deepEqual(
    Merge(
      {
        a: {
          a: [1],
        },
      },
      {
        a: {
          "override:a": [2],
        },
      }
    ),
    {
      a: {
        a: [2],
      },
    }
  );

  t.deepEqual(
    Merge(
      {
        "override:a": {
          a: [1],
        },
      },
      {
        a: {
          a: [2],
        },
      }
    ),
    {
      a: {
        a: [1, 2],
      },
    }
  );

  t.deepEqual(
    Merge(
      {
        a: {
          a: [1],
          b: [1],
        },
      },
      {
        "override:a": {
          a: [2],
        },
      }
    ),
    {
      a: {
        a: [2],
      },
    }
  );

  t.deepEqual(
    Merge(
      {
        a: {
          a: {
            a: [1],
          },
        },
      },
      {
        a: {
          "override:a": {
            a: [2],
          },
        },
      }
    ),
    {
      a: {
        a: {
          a: [2],
        },
      },
    }
  );
});

test("Deep, override: empty", (t) => {
  t.deepEqual(Merge({}, { a: { b: [3, 4] } }), { a: { b: [3, 4] } });
  t.deepEqual(Merge({}, { a: [2] }), { a: [2] });
  t.deepEqual(Merge({}, { "override:a": [2] }), { a: [2] });
  t.deepEqual(Merge({}, { a: { "override:b": [3, 4] } }), { a: { b: [3, 4] } });
});
