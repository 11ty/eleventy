import test from "ava";
import Eleventy from "../src/Eleventy";
import config from "../src/Config";

test("Eleventy, defaults inherit from config", async t => {
  let elev = new Eleventy();

  t.truthy(elev.input);
  t.truthy(elev.output);
  t.is(elev.input, config.dir.input);
  t.is(elev.output, config.dir.output);
});

test("Eleventy, get version", t => {
  let elev = new Eleventy();

  t.truthy(elev.getVersion());
});

test("Eleventy, get help", t => {
  let elev = new Eleventy();

  t.truthy(elev.getHelp());
});

test("Eleventy, set is verbose", t => {
  let elev = new Eleventy();
  elev.setIsVerbose(true);

  t.true(elev.isVerbose);
});

test("Eleventy set input/output", async t => {
  let elev = new Eleventy("./test/stubs", "./test/stubs/_site");

  t.is(elev.input, "./test/stubs");
  t.is(elev.output, "./test/stubs/_site");

  await elev.init();
  t.truthy(elev.data);
  t.truthy(elev.writer);
});
