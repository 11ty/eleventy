const test = require("ava");
const ConsoleLogger = require("../src/Util/ConsoleLogger");

test("Disable chalk", (t) => {
  let cl = new ConsoleLogger();
  cl.isChalkEnabled = false;
  t.is(cl.isChalkEnabled, false);
});

test("Re-enable chalk", (t) => {
  let cl = new ConsoleLogger();
  cl.isChalkEnabled = false;
  cl.isChalkEnabled = true;
  t.is(cl.isChalkEnabled, true);
});

test("Message styles", (t) => {
  let cl = new ConsoleLogger();
  let logged;
  cl.message = (msg, type, color, forceToConsole) =>
    (logged = { msg, type, color, forceToConsole });

  cl.log("test");
  t.deepEqual(logged, {
    msg: "test",
    type: undefined,
    color: undefined,
    forceToConsole: undefined,
  });

  cl.forceLog("test");
  t.deepEqual(logged, {
    msg: "test",
    type: undefined,
    color: undefined,
    forceToConsole: true,
  });

  cl.info("test");
  t.deepEqual(logged, {
    msg: "test",
    type: "warn",
    color: "blue",
    forceToConsole: undefined,
  });

  cl.warn("test");
  t.deepEqual(logged, {
    msg: "test",
    type: "warn",
    color: "yellow",
    forceToConsole: undefined,
  });

  cl.error("test");
  t.deepEqual(logged, {
    msg: "test",
    type: "error",
    color: "red",
    forceToConsole: undefined,
  });
});

test("Close Stream", (t) => {
  return new Promise((resolve, reject) => {
    let cl = new ConsoleLogger();
    cl.outputStream.on("close", () => {
      t.pass();
      resolve();
    });
    cl.outputStream.on("error", reject);
    // We need to listen for data, so a pushed null closes the stream
    cl.outputStream.on("data", reject);
    cl.closeStream();
  });
});
