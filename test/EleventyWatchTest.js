import test from "ava";
import EleventyWatch from "../src/EleventyWatch.js";

test("Standard", (t) => {
  let watch = new EleventyWatch();
  t.is(watch.isBuildRunning(), false);

  watch.setBuildRunning();
  t.is(watch.isBuildRunning(), true);

  watch.setBuildFinished();
  t.is(watch.isBuildRunning(), false);
});

test("Incremental", (t) => {
  let watch = new EleventyWatch();
  t.is(watch.getIncrementalFile(), false);

  watch.incremental = true;
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.addToPendingQueue("test.md");
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.setBuildRunning();
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getActiveQueueSize(), 1);
  t.is(watch.getIncrementalFile(), "./test.md");
  t.deepEqual(watch.getActiveQueue(), ["./test.md"]);

  watch.setBuildFinished();
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);
  t.deepEqual(watch.getPendingQueue(), []);
});

test("Incremental queue 2", (t) => {
  let watch = new EleventyWatch();
  t.is(watch.getIncrementalFile(), false);

  watch.incremental = true;
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.addToPendingQueue("test.md");
  watch.addToPendingQueue("test2.md");
  t.is(watch.getPendingQueueSize(), 2);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.setBuildRunning();
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 1);
  t.is(watch.getIncrementalFile(), "./test.md");
  t.deepEqual(watch.getActiveQueue(), ["./test.md"]);

  watch.setBuildFinished();
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getPendingQueue(), ["./test2.md"]);
  t.deepEqual(watch.getActiveQueue(), []);
});

test("Incremental add while active", (t) => {
  let watch = new EleventyWatch();
  t.is(watch.getIncrementalFile(), false);

  watch.incremental = true;
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.addToPendingQueue("test.md");
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.setBuildRunning();
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getActiveQueueSize(), 1);
  t.is(watch.getIncrementalFile(), "./test.md");
  t.deepEqual(watch.getActiveQueue(), ["./test.md"]);

  watch.addToPendingQueue("test2.md");
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 1);
  t.is(watch.getIncrementalFile(), "./test.md");
  t.deepEqual(watch.getActiveQueue(), ["./test.md"]);

  watch.setBuildFinished();
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getPendingQueue(), ["./test2.md"]);
  t.deepEqual(watch.getActiveQueue(), []);
});

test("Non-incremental", (t) => {
  let watch = new EleventyWatch();
  t.is(watch.getIncrementalFile(), false);

  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.addToPendingQueue("test.md");
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.setBuildRunning();
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getActiveQueueSize(), 1);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), ["./test.md"]);

  watch.setBuildFinished();
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);
});

test("Non-incremental queue 2", (t) => {
  let watch = new EleventyWatch();
  t.is(watch.getIncrementalFile(), false);

  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.addToPendingQueue("test.md");
  watch.addToPendingQueue("test2.md");
  t.is(watch.getPendingQueueSize(), 2);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.setBuildRunning();
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getActiveQueueSize(), 2);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), ["./test.md", "./test2.md"]);

  watch.setBuildFinished();
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getPendingQueue(), []);
  t.deepEqual(watch.getActiveQueue(), []);
});

test("Non-incremental add while active", (t) => {
  let watch = new EleventyWatch();
  t.is(watch.getIncrementalFile(), false);

  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);

  watch.addToPendingQueue("test.md");
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), []);

  watch.setBuildRunning();
  t.is(watch.getPendingQueueSize(), 0);
  t.is(watch.getActiveQueueSize(), 1);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), ["./test.md"]);

  watch.addToPendingQueue("test.md");
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 1);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getActiveQueue(), ["./test.md"]);

  watch.setBuildFinished();
  t.is(watch.getPendingQueueSize(), 1);
  t.is(watch.getActiveQueueSize(), 0);
  t.is(watch.getIncrementalFile(), false);
  t.deepEqual(watch.getPendingQueue(), ["./test.md"]);
  t.deepEqual(watch.getActiveQueue(), []);
});

test("Active queue tests", (t) => {
  let watch = new EleventyWatch();
  watch.addToPendingQueue("test.md");
  watch.addToPendingQueue("test2.md");
  watch.addToPendingQueue("test.css");

  t.is(
    watch.hasAllQueueFiles((path) => path.startsWith("./test")),
    false
  );

  watch.setBuildRunning();
  t.is(watch.hasAllQueueFiles("slkdjflkjsdlkfj"), false);
  t.is(
    watch.hasAllQueueFiles((path) => path.startsWith("./test")),
    true
  );
  t.is(
    watch.hasAllQueueFiles((path) => path.endsWith(".css")),
    false
  );

  t.is(watch.hasQueuedFile("./test.md"), true);
  t.is(watch.hasQueuedFile("./testsdkljfklja.md"), false);
  watch.setBuildFinished();

  t.is(
    watch.hasAllQueueFiles((path) => path.startsWith("./test")),
    false
  );
});

test("Active queue tests, all CSS files", (t) => {
  let watch = new EleventyWatch();
  watch.addToPendingQueue("test.css");
  watch.addToPendingQueue("test2.css");
  watch.addToPendingQueue("test3.css");

  t.is(
    watch.hasAllQueueFiles((path) => path.endsWith(".css")),
    false
  );

  watch.setBuildRunning();
  t.is(
    watch.hasAllQueueFiles((path) => path.endsWith(".css")),
    true
  );
  watch.setBuildFinished();

  t.is(
    watch.hasAllQueueFiles((path) => path.endsWith(".css")),
    false
  );
});
