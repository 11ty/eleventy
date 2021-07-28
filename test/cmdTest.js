const test = require("ava");
const { exec } = require("child_process");

test.cb("Test command line exit code success", (t) => {
  exec(
    "node ./cmd.js --input=test/stubs/exitCode_success --dryrun",
    (error, stdout, stderr) => {
      t.falsy(error);
      t.end();
    }
  );
});

test.cb("Test command line exit code for template error", (t) => {
  exec(
    "node ./cmd.js --input=test/stubs/exitCode --dryrun",
    (error, stdout, stderr) => {
      t.is(error.code, 1);
      t.end();
    }
  );
});

test.cb("Test command line exit code for global data error", (t) => {
  exec(
    "node ./cmd.js --input=test/stubs/exitCode_globalData --dryrun",
    (error, stdout, stderr) => {
      t.is(error.code, 1);
      t.end();
    }
  );
});

test.cb("Test data should not process in a --help", (t) => {
  exec(
    "node ./cmd.js --input=test/stubs/cmd-help-processing --help",
    (error, stdout, stderr) => {
      t.falsy(error);
      t.is(stdout.indexOf("THIS SHOULD NOT LOG TO CONSOLE"), -1);
      t.end();
    }
  );
});

test.cb("Test data should not process in a --version", (t) => {
  exec(
    "node ./cmd.js --input=test/stubs/cmd-help-processing --version",
    (error, stdout, stderr) => {
      t.falsy(error);
      t.is(stdout.indexOf("THIS SHOULD NOT LOG TO CONSOLE"), -1);
      t.end();
    }
  );
});
