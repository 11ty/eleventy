import test from "ava";

import ExistsCache from "../src/Util/ExistsCache.js";

test("Simple check (with directory checking)", async t => {
  let cache = new ExistsCache();
	cache.setDirectoryCheck(true);

  t.is(cache.exists("test"), true);
  t.is(cache.size, 1);
  t.is(cache.lookupCount, 1);
  t.is(cache.exists("test/stubs"), true);
  t.is(cache.size, 2);
  t.is(cache.lookupCount, 2);
  t.is(cache.exists("test/stubs/does-not-exist-ever-hslkadjflk"), false);
  t.is(cache.size, 3);
  t.is(cache.lookupCount, 3);
});

test("Simple check (parent directory is valid)", async t => {
  let cache = new ExistsCache();
	cache.setDirectoryCheck(true);

  t.is(cache.exists("test/stubs"), true);
  t.is(cache.size, 2);
  t.is(cache.lookupCount, 1);

	// we already know this parent folder exists
  t.is(cache.exists("test"), true);
  t.is(cache.size, 2);
  t.is(cache.lookupCount, 1);

	// we don’t know if this exists
  t.is(cache.exists("test/stubs/does-not-exist-ever-hslkadjflk"), false);
  t.is(cache.size, 3);
  t.is(cache.lookupCount, 2);
});

test("Simple check (parent directory already invalidated)", async t => {
  let cache = new ExistsCache();
	cache.setDirectoryCheck(true);

  t.is(cache.exists("test/folder-does-not-exist-askdfjkladjs"), false);
  t.is(cache.size, 1);
  t.is(cache.lookupCount, 1);

	// we already know this *doesn’t* exist.
  t.is(cache.exists("test/folder-does-not-exist-askdfjkladjs/file-we-already-know-does-not-exist.liquid"), false);
	t.is(cache.size, 1);
  t.is(cache.lookupCount, 1);
});


test("Simple check (without directory checking)", async t => {
  let cache = new ExistsCache();
	// cache.setDirectoryCheck(false);

  t.is(cache.exists("test/stubs"), true);
  t.is(cache.size, 1);
  t.is(cache.lookupCount, 1);
  t.is(cache.exists("test"), true);
  t.is(cache.size, 2);
  t.is(cache.lookupCount, 2);
});
