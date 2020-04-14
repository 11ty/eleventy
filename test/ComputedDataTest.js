import test from "ava";
import ComputedData from "../src/ComputedData";
import ComputedDataProxy from "../src/ComputedDataProxy";
import ComputedDataTemplateString from "../src/ComputedDataTemplateString";

test("Get fake proxy data", t => {
  let cd = new ComputedDataTemplateString(["key1", "key2"]);
  t.deepEqual(cd.getProxyData(), {
    key1: `${cd.prefix}key1${cd.suffix}`,
    key2: `${cd.prefix}key2${cd.suffix}`
  });
});

test("Get nested fake proxy data", t => {
  let cd = new ComputedDataTemplateString(["key1.nested", "key2"]);
  t.deepEqual(cd.getProxyData(), {
    key1: {
      nested: `${cd.prefix}key1.nested${cd.suffix}`
    },
    key2: `${cd.prefix}key2${cd.suffix}`
  });
});

test("Get vars from output", t => {
  let cd = new ComputedDataTemplateString();
  t.deepEqual(cd.findVarsInOutput(""), []);
  t.deepEqual(cd.findVarsInOutput("slkdjfkljdsf"), []);
  t.deepEqual(
    cd.findVarsInOutput(`slkdjfkljdsf${cd.prefix}${cd.suffix}sldkjflkds`),
    []
  );
  t.deepEqual(
    cd.findVarsInOutput(
      `slkdjfkljdsf${cd.prefix}firstVar${cd.suffix}sldkjflkds`
    ),
    ["firstVar"]
  );
  t.deepEqual(
    cd.findVarsInOutput(
      `slkdjfkljdsf${cd.prefix}firstVar${cd.suffix}test${cd.prefix}firstVar${cd.suffix}sldkjflkds`
    ),
    ["firstVar"]
  );
  t.deepEqual(
    cd.findVarsInOutput(
      `slkdjfkljdsf${cd.prefix}firstVar${cd.suffix}test${cd.prefix}secondVar${cd.suffix}sldkjflkds`
    ),
    ["firstVar", "secondVar"]
  );
});

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

test("Get vars used by function", async t => {
  let cd = new ComputedDataProxy();
  let key1Fn = () => {};
  let key2Fn = data => {
    return `${data.key1}`;
  };

  t.deepEqual(await cd.findVarsUsed(key1Fn), []);
  t.deepEqual(await cd.findVarsUsed(key2Fn), ["key1"]);
});

test("Get vars used by function (not a computed key)", async t => {
  let cd = new ComputedDataProxy();
  let key1Fn = data => {
    return `${data.page.url}`;
  };

  t.deepEqual(await cd.findVarsUsed(key1Fn), ["page.url"]);
});

test("Get vars used by function (multiple functions—not computed keys)", async t => {
  let cd = new ComputedDataProxy();
  let key1Fn = data => {
    return `${data.page.url}`;
  };
  let key2Fn = data => {
    return `${data.key1}${data.very.deep.reference}${data.very.other.deep.reference}`;
  };

  t.deepEqual(await cd.findVarsUsed(key1Fn), ["page.url"]);
  t.deepEqual(await cd.findVarsUsed(key2Fn), [
    "key1",
    "very.deep.reference",
    "very.other.deep.reference"
  ]);
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
