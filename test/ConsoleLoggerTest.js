const test = require("ava");
const ConsoleLogger = require("../src/Util/ConsoleLogger");

test("Disable chalk", (t) => {
  ConsoleLogger.isChalkEnabled = false;
  t.is(ConsoleLogger.isChalkEnabled, false);
});
