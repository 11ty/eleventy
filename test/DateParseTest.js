import test from "ava";
import { fromISOtoDateUTC as parse } from "../src/Adapters/Packages/luxon.js";

// https://moment.github.io/luxon/#/parsing?id=ad-hoc-parsing
// ISO8601 date parsing https://github.com/11ty/eleventy/issues/3587
test("Backwards compatibility with luxon #3587", (t) => {
  t.is(parse("2016").getTime(), Date.UTC(2016));
  t.is(parse("2016-05").getTime(), Date.UTC(2016, 4));
  t.is(parse("201605")?.getTime(), Date.UTC(2016, 4));
  t.is(parse("2016-05-25").getTime(), Date.UTC(2016, 4, 25));
  t.is(parse("2000-01-07")?.getTime(), Date.UTC(2000, 0, 7));
  t.is(parse("20000107")?.getTime(), Date.UTC(2000, 0, 7));
  t.is(parse("20160525")?.getTime(), Date.UTC(2016, 4, 25));
  t.is(parse("2016-05-25T09").getTime(), Date.UTC(2016, 4, 25, 9));
  t.is(parse("2016-05-25T09:24").getTime(),Date.UTC(2016, 4, 25, 9, 24));
  t.is(parse("2016-05-25T09:24:15").getTime(),Date.UTC(2016, 4, 25, 9, 24, 15));
  t.is(parse("2016-05-25T09:24:15.123").getTime(),Date.UTC(2016, 4, 25, 9, 24, 15, 123));
  t.is(parse("2016-05-25T0924").getTime(),Date.UTC(2016, 4, 25, 9, 24));
  t.is(parse("2016-05-25T092415").getTime(),Date.UTC(2016, 4, 25, 9, 24, 15));
  t.is(parse("2016-05-25T092415.123").getTime(),Date.UTC(2016, 4, 25, 9, 24, 15, 123));
  t.is(parse("2016-05-25T09:24:15,123").getTime(),Date.UTC(2016, 4, 25, 9, 24, 15, 123));
  t.is(parse("2016-W21-3")?.getTime(), Date.UTC(2016, 4, 25));
  t.is(parse("2016W213").getTime(),Date.UTC(2016, 4, 25));
  t.is(parse("2016-W21-3T09:24:15.123").getTime(),Date.UTC(2016, 4, 25, 9, 24, 15, 123));
  t.is(parse("2016W213T09:24:15.123").getTime(),Date.UTC(2016, 4, 25, 9, 24, 15, 123));
  t.is(parse("2016-200").getTime(),Date.UTC(2016, 6, 18));
  t.is(parse("2016200").getTime(),Date.UTC(2016, 6, 18));
  t.is(parse("2016-200T09:24:15.123").getTime(),Date.UTC(2016, 6, 18, 9, 24, 15, 123));

  // Times
  // t.is(parse("09:24").getTime(),);
  // t.is(parse("09:24:15").getTime(),);
  // t.is(parse("09:24:15.123").getTime(),);
  // t.is(parse("09:24:15,123").getTime(),);

  // Invalid in Luxon
  // t.is(parse("+2021-018")?.getTime(),Date.UTC(2016, 4, 25, 9));

  // More https://ijmacd.github.io/iso8601/ and https://ijmacd.github.io/rfc3339-iso8601/
});
