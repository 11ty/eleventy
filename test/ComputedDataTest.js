import test from "ava";
import ComputedData from "../src/ComputedData";

test("Get fake proxy data", t => {
  let cd = new ComputedData();
  cd.add("key1", () => {});
  cd.add("key2", () => {});
  t.deepEqual(cd.getProxyData({}), {
    key1: `${cd.prefix}key1${cd.suffix}`,
    key2: `${cd.prefix}key2${cd.suffix}`
  });
});

test("Get nested fake proxy data", t => {
  let cd = new ComputedData();
  cd.add("key1.nested", () => {});
  cd.add("key2", () => {});
  t.deepEqual(cd.getProxyData({}), {
    key1: {
      nested: `${cd.prefix}key1.nested${cd.suffix}`
    },
    key2: `${cd.prefix}key2${cd.suffix}`
  });
});

test("Get vars from output", t => {
  let cd = new ComputedData();
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

  cd.add("keystr", `this is a str`);
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
