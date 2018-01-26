import test from "ava";
import EleventyError from "../src/EleventyError";

test("Constructor", t => {
  let oldError = new Error();
  let newError = new Error();
  let ee = new EleventyError(newError, oldError);

  t.is(ee.errors.length, 2);
});

test("Static Constructor", t => {
  let oldError = new Error();
  let newError = new Error();
  let ee = EleventyError.make(newError, oldError);

  t.is(ee.errors.length, 2);
});

test("Static Constructor with already existing EleventyError", t => {
  let oldError = new Error();
  let newError = new Error();
  let ee1 = EleventyError.make(newError, oldError);

  let newError2 = new Error();
  let ee2 = EleventyError.make(newError2, ee1);

  t.is(ee1.errors.length, 3);
  t.is(ee2.errors.length, 3);
});

test("getAll", t => {
  let oldError = new Error();
  let newError = new Error();
  let ee = EleventyError.make(newError, oldError);

  t.is(ee.getAll().length, 2);
});

test("log", t => {
  let oldError = new Error();
  let newError = new Error();
  let ee = EleventyError.make(newError, oldError);

  t.truthy(ee.log());
});
