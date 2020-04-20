import test from "ava";
import ComputedData from "../src/ComputedData";

test("Basic get/set", async t => {
  let cd = new ComputedData();

  cd.add("keystr", "this is a str");
  cd.add("key1", data => {
    return `this is a test ${data.key2}${data.keystr}`;
  });

  let data = {
    key2: "inject me"
  };
  await cd.setupData(data);

  t.is(data.key1, "this is a test inject methis is a str");
  t.is(data.key2, "inject me");
  t.is(data.keystr, "this is a str");
});

test("Basic get/set (reverse order of adds)", async t => {
  let cd = new ComputedData();

  cd.add("key1", data => {
    return `this is a test ${data.key2}${data.keystr}`;
  });
  cd.add("keystr", "this is a str");

  let data = {
    key2: "inject me"
  };
  await cd.setupData(data);

  t.is(data.key1, "this is a test inject methis is a str");
  t.is(data.key2, "inject me");
  t.is(data.keystr, "this is a str");
});

test("Basic get/set (reverse order of adds) nested two deep", async t => {
  let cd = new ComputedData();

  cd.add("key1.key3", data => {
    return `this is a test ${data.key2}${data.keystr}`;
  });
  cd.add("key1.key4", data => {
    return `this is a test ${data.key1.key3}`;
  });
  cd.add("keystr", "this is a str");

  let data = {
    key2: "inject me"
  };
  await cd.setupData(data);

  t.is(data.key1.key3, "this is a test inject methis is a str");
  t.is(data.key1.key4, "this is a test this is a test inject methis is a str");
  t.is(data.key2, "inject me");
  t.is(data.keystr, "this is a str");
});

test("use a computed value in another computed", async t => {
  let cd = new ComputedData();
  cd.add("keyComputed", data => {
    return `this is a test ${data.keyOriginal}`;
  });
  cd.add("keyComputed2nd", data => {
    return `using computed ${data.keyComputed}`;
  });

  let data = {
    keyOriginal: "inject me"
  };
  await cd.setupData(data);

  t.is(data.keyComputed2nd, "using computed this is a test inject me");
});

test("use a computed value in another computed (out of order)", async t => {
  let cd = new ComputedData();
  cd.add("keyComputed2nd", data => {
    return `using computed ${data.keyComputed}`;
  });
  cd.add("keyComputed", data => {
    return `this is a test ${data.keyOriginal}`;
  });

  let data = {
    keyOriginal: "inject me"
  };
  await cd.setupData(data);

  t.is(data.keyComputed2nd, "using computed this is a test inject me");
});

test("use a computed value in another computed (out of order), async callbacks", async t => {
  let cd = new ComputedData();
  cd.add("keyComputed2nd", async data => {
    // await in data.keyComputed is optional 👀
    return `using computed ${data.keyComputed}`;
  });
  cd.add("keyComputed", async data => {
    // await in data.keyOriginal is optional 👀
    return `this is a test ${await data.keyOriginal}`;
  });

  let data = {
    keyOriginal: "inject me"
  };
  await cd.setupData(data);

  t.is(data.keyComputed2nd, "using computed this is a test inject me");
});

test("Basic get/set nested", async t => {
  let cd = new ComputedData();

  cd.add("key1.nested", data => {
    return `${data.key2}`;
  });
  cd.add("key2", data => "hi");

  let data = {
    key2: "inject me"
  };
  await cd.setupData(data);

  t.deepEqual(data.key1, { nested: "hi" });
  t.is(data.key1.nested, "hi");
  t.is(data.key2, "hi");
});

test("Basic get/set nested deeper", async t => {
  let cd = new ComputedData();

  cd.add("key1.nested.deeperA", data => {
    return `${data.key2}`;
  });
  cd.add("key1.nested.deeperB", data => {
    return `${data.key2}`;
  });
  cd.add("key1.nested.deeperC.wow", data => {
    return `${data.key2}`;
  });
  cd.add("key2", data => "hi");

  let data = {
    key1: {
      nonComputed: "hi"
    },
    key2: "inject me"
  };
  await cd.setupData(data);

  t.deepEqual(data.key1, {
    nonComputed: "hi",
    nested: {
      deeperA: "hi",
      deeperB: "hi",
      deeperC: {
        wow: "hi"
      }
    }
  });

  t.is(data.key1.nested.deeperA, "hi");
  t.is(data.key1.nested.deeperB, "hi");
  t.is(data.key1.nested.deeperC.wow, "hi");
  t.is(data.key1.nonComputed, "hi");
  t.is(data.key2, "hi");
});

test("template string versus function types", async t => {
  let cd = new ComputedData();

  cd.add("key1.nested.deeperA", data => {
    return `${data.key2}`;
  });
  cd.add("key2", () => "hi");

  let data = {
    key1: {
      nonComputed: "hi"
    },
    key2: "inject me"
  };
  await cd.setupData(data);

  t.deepEqual(data.key1, {
    nonComputed: "hi",
    nested: {
      deeperA: "hi"
    }
  });
});

test("Basic get/set with template string", async t => {
  let cd = new ComputedData();

  cd.addTemplateString("keystr", "this is a str");
  cd.addTemplateString("key1", data => {
    return `this is a test ${data.key2}${data.keystr}`;
  });

  let data = {
    key2: "inject me"
  };
  await cd.setupData(data);

  t.is(data.key1, "this is a test inject methis is a str");
  t.is(data.key2, "inject me");
  t.is(data.keystr, "this is a str");
});

test("Basic get/set using array data", async t => {
  t.plan(5);
  let cd = new ComputedData();

  cd.add("keystr", "this is a str");
  cd.add("key1", data => {
    t.is(Array.isArray(data.arr), true);
    return `this is a test ${data.arr[0]}${data.keystr}`;
  });

  let data = {
    arr: ["inject me"],
    collections: {
      first: [],
      second: []
    }
  };
  await cd.setupData(data);

  t.is(data.key1, "this is a test inject methis is a str");
  t.is(data.arr[0], "inject me");
  t.is(data.keystr, "this is a str");
});
