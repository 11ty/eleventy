import test from "ava";
import { exec } from "child_process";

test("Test command line exit code success", async (t) => {
  await new Promise((resolve) => {
    exec("node ./cmd.cjs --input=test/stubs/exitCode_success --dryrun", (error, stdout, stderr) => {
      t.falsy(error);
      resolve();
    });
  });
});

test("Test command line exit code for template error", async (t) => {
  await new Promise((resolve) => {
    exec("node ./cmd.cjs --input=test/stubs/exitCode --dryrun", (error, stdout, stderr) => {
      t.is(error.code, 1);
      resolve();
    });
  });
});

test("Test command line exit code for global data error", async (t) => {
  await new Promise((resolve) => {
    exec(
      "node ./cmd.cjs --input=test/stubs/exitCode_globalData --dryrun",
      (error, stdout, stderr) => {
        t.is(error.code, 1);
        resolve();
      }
    );
  });
});

test("Test data should not process in a --help", async (t) => {
  await new Promise((resolve) => {
    exec(
      "node ./cmd.cjs --input=test/stubs/cmd-help-processing --help",
      (error, stdout, stderr) => {
        t.falsy(error);
        t.is(stdout.indexOf("THIS SHOULD NOT LOG TO CONSOLE"), -1);
        resolve();
      }
    );
  });
});

test("Test data should not process in a --version", async (t) => {
  await new Promise((resolve) => {
    exec(
      "node ./cmd.cjs --input=test/stubs/cmd-help-processing --version",
      (error, stdout, stderr) => {
        t.falsy(error);
        t.is(stdout.indexOf("THIS SHOULD NOT LOG TO CONSOLE"), -1);
        resolve();
      }
    );
  });
});
