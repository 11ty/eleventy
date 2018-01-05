import test from "ava";
import Sortable from "../src/Util/Sortable";

test("Alphabetic Ascending", t => {
  var s = new Sortable();
  s.add("a");
  s.add("z");
  s.add("m");
  t.deepEqual(s.sort(), ["a", "m", "z"]);
});

test("Alphabetic Descending", t => {
  var s = new Sortable();
  s.setSortDescending();
  s.add("a");
  s.add("z");
  s.add("m");
  t.deepEqual(s.sort(), ["z", "m", "a"]);
});

test("Numeric Ascending", t => {
  var s = new Sortable();
  s.setSortNumeric(true);
  s.add(1);
  s.add(4);
  s.add(2);
  t.deepEqual(s.sort(), [1, 2, 4]);
});

test("Numeric Descending", t => {
  var s = new Sortable();
  s.setSortDescending();
  s.add(1);
  s.add(4);
  s.add(2);
  t.deepEqual(s.sort(), [4, 2, 1]);
});

// test("Combo (alphabetic) Ascending", t => {
//   var s = new Sortable();
//   s.add("a");
//   s.add("z");
//   s.add("m");
//   s.add(0);
//   s.add(10);
//   s.add(1);
//   s.add(12);
// });

// test("Combo (numeric) Ascending", t => {
//   var s = new Sortable();
//   s.setSortNumeric(true);
//   s.add("a");
//   s.add("z");
//   s.add("m");
//   s.add(0);
//   s.add(10);
//   s.add(1);
//   s.add(12);
// });
