import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("Custom date parsing callback (one, return string), Issue #867", async (t) => {
  t.plan(2);

  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("test.html", `# Markdown`);
      eleventyConfig.dataFilterSelectors.add("page.date");

      eleventyConfig.addDateParsing((dateValue) => {
        t.is(dateValue, undefined);
        return "2001-01-01T12:00:00Z";
      });
    }
  });
  elev.disableLogger();

  let [result] = await elev.toJSON();
  t.deepEqual(result.data.page.date, new Date(Date.UTC(2001,0,1,12)));
});

test("Custom date parsing callback (one, return Date), Issue #867", async (t) => {
  t.plan(2);

  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("test.html", `# Markdown`);
      eleventyConfig.dataFilterSelectors.add("page.date");

      eleventyConfig.addDateParsing((dateValue) => {
        t.is(dateValue, undefined);
        return new Date(Date.UTC(2001,0,1,12));
      });
    }
  });
  elev.disableLogger();

  let [result] = await elev.toJSON();
  t.deepEqual(result.data.page.date, new Date(Date.UTC(2001,0,1,12)));
});

test("Custom date parsing callback (one, using date from data cascade, return string), Issue #867", async (t) => {
  t.plan(2);

  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("test.html", `# Markdown`, {
        date: new Date(Date.UTC(2002, 0, 1, 12))
      });
      eleventyConfig.dataFilterSelectors.add("page.date");

      eleventyConfig.addDateParsing((dateValue) => {
        t.true(dateValue instanceof Date);
        return "2001-01-01T12:00:00Z";
      });
    }
  });
  elev.disableLogger();

  let [result] = await elev.toJSON();
  t.deepEqual(result.data.page.date, new Date(Date.UTC(2001,0,1,12)));
});

test("Custom date parsing callback (two, return undefined/falsy), Issue #867", async (t) => {
  t.plan(3);

  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("test.html", `# Markdown`, {
        date: new Date(Date.UTC(2003, 0, 1, 12))
      });
      eleventyConfig.dataFilterSelectors.add("page.date");

      eleventyConfig.addDateParsing((dateValue) => {
        t.deepEqual(dateValue, new Date(Date.UTC(2003,0,1,12)));
        // return nothing
      });

      eleventyConfig.addDateParsing((dateValue) => {
        t.deepEqual(dateValue, new Date(Date.UTC(2003,0,1,12)));
        // return nothing
      });
    }
  });
  elev.disableLogger();

  let [result] = await elev.toJSON();
  t.deepEqual(result.data.page.date, new Date(Date.UTC(2003,0,1,12)));
});

test("Custom date parsing callback (two, return explicit false), Issue #867", async (t) => {
  t.plan(1);

  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("test.html", `# Markdown`, {
        date: new Date(Date.UTC(2003, 0, 1, 12))
      });
      eleventyConfig.dataFilterSelectors.add("page.date");

      eleventyConfig.addDateParsing((dateValue) => {
        return false;
      });
    }
  });

  elev.disableLogger();

  let [result] = await elev.toJSON();
  t.deepEqual(result.data.page.date, undefined);
});

test("Custom date parsing callbacks (two, last wins, return string), Issue #867", async (t) => {
  t.plan(3);

  let elev = new Eleventy("./test/stubs-virtual/", "./test/stubs-virtual/", {
    config: eleventyConfig => {
      eleventyConfig.addTemplate("test.html", `# Markdown`);
      eleventyConfig.dataFilterSelectors.add("page.date");

      eleventyConfig.addDateParsing((dateValue) => {
        t.is(dateValue, undefined);
        return "2010-01-01T12:00:00Z";
      });

      eleventyConfig.addDateParsing((dateValue) => {
        t.is(dateValue, "2010-01-01T12:00:00Z");
        return "2001-01-01T12:00:00Z";
      });
    }
  });
  elev.disableLogger();

  let [result] = await elev.toJSON();
  t.deepEqual(result.data.page.date, new Date(Date.UTC(2001,0,1,12)));
});
