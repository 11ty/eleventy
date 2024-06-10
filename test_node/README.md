# test_node Unit Tests

This folder is the start of a test suite using the [official Node Test Runner](https://nodejs.org/api/test.html). It was originally introduced to workaround issues with `tsx` and `@mdx-js/node-loader` using worker threads (not supported by the existing test runner, [ava](https://github.com/avajs/ava)). Rather than use `--no-worker-threads` with a separate `ava` run, we’re slowly migrating to this new approach.
