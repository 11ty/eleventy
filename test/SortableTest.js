import test from "ava";
import { DateTime } from "luxon";
import Sortable from "../src/Util/Sortable";

test("get Sort Function", t => {
  let s = new Sortable();
  t.deepEqual(s.getSortFunction(), Sortable.sortFunctionAlphabeticAscending);
});

test("Alphabetic Ascending", t => {
  let s = new Sortable();
  s.add("a");
  s.add("z");
  s.add("m");
  t.deepEqual(s.sort(), ["a", "m", "z"]);
});

test("Alphabetic Descending", t => {
  let s = new Sortable();
  s.setSortDescending();
  s.add("a");
  s.add("z");
  s.add("m");
  t.deepEqual(s.sort(), ["z", "m", "a"]);
});

test("Numeric Ascending", t => {
  let s = new Sortable();
  s.setSortNumeric(true);
  s.add(1);
  s.add(4);
  s.add(2);
  t.deepEqual(s.sort(), [1, 2, 4]);
});

test("Numeric Descending", t => {
  let s = new Sortable();
  s.setSortNumeric(true);
  s.setSortDescending();
  s.add(1);
  s.add(4);
  s.add(2);
  t.deepEqual(s.sort(), [4, 2, 1]);
});

test("Date Assumptions", t => {
  t.is(DateTime.fromISO("2007-10-10") - new Date(2007, 9, 10).getTime(), 0);
  t.is(DateTime.fromISO("2008-10-10") - new Date(2008, 9, 10).getTime(), 0);
  t.not(DateTime.fromISO("2008-10-10") - new Date(2007, 9, 10).getTime(), 0);
});

test("Date and Sortable Assumptions", t => {
  // Sortable works here without extra code because Luxon’s valueOf works in equality comparison (for alphabetic lists)
  t.is(
    Sortable.sortFunctionAlphabeticAscending(
      DateTime.fromISO("2007-10-10"),
      new Date(2007, 9, 10).getTime()
    ),
    0
  );
  t.is(
    Sortable.sortFunctionAlphabeticDescending(
      DateTime.fromISO("2007-10-10"),
      new Date(2007, 9, 10).getTime()
    ),
    0
  );

  t.is(
    Sortable.sortFunctionAlphabeticAscending(
      DateTime.fromISO("2008-10-10"),
      new Date(2007, 9, 10).getTime()
    ),
    1
  );
  t.is(
    Sortable.sortFunctionAlphabeticDescending(
      DateTime.fromISO("2008-10-10"),
      new Date(2007, 9, 10).getTime()
    ),
    -1
  );

  // Sortable works here without extra code because Luxon’s valueOf works in subtraction (for numeric lists)
  t.is(
    Sortable.sortFunctionNumericAscending(
      DateTime.fromISO("2008-10-10"),
      new Date(2008, 9, 10).getTime()
    ),
    0
  );
  t.is(
    Sortable.sortFunctionNumericDescending(
      DateTime.fromISO("2008-10-10"),
      new Date(2008, 9, 10).getTime()
    ),
    0
  );

  t.true(
    Sortable.sortFunctionNumericAscending(
      DateTime.fromISO("2008-10-10"),
      new Date(2007, 9, 10).getTime()
    ) > 0
  );
  t.true(
    Sortable.sortFunctionNumericDescending(
      DateTime.fromISO("2008-10-10"),
      new Date(2007, 9, 10).getTime()
    ) < 0
  );
});

test("Date Ascending", t => {
  let s = new Sortable();
  let date1 = DateTime.fromISO("2007-10-10");
  let date2 = DateTime.fromISO("2008-10-10");
  let date3 = DateTime.fromISO("2009-10-10");
  s.add(date3);
  s.add(date2);
  s.add(date1);
  t.deepEqual(s.sort(), [date1, date2, date3]);
});

test("Date Descending", t => {
  let s = new Sortable();
  s.setSortDescending();
  let date1 = DateTime.fromISO("2007-10-10");
  let date2 = DateTime.fromISO("2008-10-10");
  let date3 = DateTime.fromISO("2009-10-10");
  s.add(date2);
  s.add(date3);
  s.add(date1);
  t.deepEqual(s.sort(), [date3, date2, date1]);
});

test("Alphabetic Ascending (str sort arg)", t => {
  let s = new Sortable();
  s.add("a");
  s.add("z");
  s.add("m");
  t.deepEqual(s.sort("ascending"), ["a", "m", "z"]);
});

test("Alphabetic Descending (str sort arg)", t => {
  let s = new Sortable();
  s.add("a");
  s.add("z");
  s.add("m");
  t.deepEqual(s.sort("descending"), ["z", "m", "a"]);
});
