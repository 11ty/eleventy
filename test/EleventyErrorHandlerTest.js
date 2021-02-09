const test = require("ava");
const EleventyErrorHandler = require("../src/EleventyErrorHandler");

test("Log a warning, error", (t) => {
  let errorHandler = new EleventyErrorHandler();
  let output = [];
  errorHandler.logger = {
    log: function (str) {
      output.push(str);
    },
    warn: function (str) {
      output.push(str);
    },
    error: function (str) {
      output.push(str);
    },
    message: function (str) {
      output.push(str);
    },
  };

  errorHandler.warn(new Error("Test warning"), "Hello");

  let expected = `Hello: (more in DEBUG output)
> Test warning

\`Error\` was thrown:
    Error: Test warning`;
  t.is(output.join("\n").substr(0, expected.length), expected);

  output = [];

  errorHandler.error(new Error("Test error"), "It’s me");

  expected = `It’s me: (more in DEBUG output)
> Test error

\`Error\` was thrown:
    Error: Test error`;
  t.is(output.join("\n").substr(0, expected.length), expected);
});
