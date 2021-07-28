const test = require("ava");
const capitalize = require("../src/Util/Capitalize");

test("capitalize", (t) => {
  t.is(capitalize("hello"), "Hello");
  t.is(capitalize("hello world"), "Hello World");
  t.is(capitalize("Testing TESTING"), "Testing TESTING");
  t.is(
    capitalize("Testing TESTING", { lowercaseRestOfWord: true }),
    "Testing Testing"
  );
});
