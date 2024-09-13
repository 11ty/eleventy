import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("addBundle", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(() => {
        eleventyConfig.addBundle("css")
      });
      eleventyConfig.addTemplate("index.njk", "{% css %}/* Hi */{% endcss %}<style>{% getBundle 'css' %}</style>");
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `<style>/* Hi */</style>`);
});

test("addBundle (empty css)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(() => {
        eleventyConfig.addBundle("css");
      });

      eleventyConfig.addTemplate("index.njk", "Hi<style>{% getBundle 'css' %}</style>");
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `Hi`);
});

test("addBundle (empty js)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(() => {
        eleventyConfig.addBundle("js");
      });

      eleventyConfig.addTemplate("index.njk", "Hi<script>{% getBundle 'js' %}</script>");
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `Hi`);
});

test("Empty script node is removed (not using bundle)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(() => {
        eleventyConfig.addBundle("js");
      });

      eleventyConfig.addTemplate("index.njk", "Hi<script></script>");
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `Hi`);
});


test("Empty style node is removed (not using bundle)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(() => {
        eleventyConfig.addBundle("css");
      });

      eleventyConfig.addTemplate("index.njk", "Hi<style></style>");
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `Hi`);
});

test("Empty link node is removed (not using bundle)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(() => {
        eleventyConfig.addBundle("css");
      });

      eleventyConfig.addTemplate("index.njk", "Hi<link rel='stylesheet' href=''>");
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `Hi`);
});

test("Empty link node is removed (no href attribute at all, not using bundle)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(() => {
        eleventyConfig.addBundle("css");
      });

      eleventyConfig.addTemplate("index.njk", "Hi<link rel='stylesheet'>");
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `Hi`);
});

test("Empty link node is kept (no rel attribute, not using bundle)", async (t) => {
  let elev = new Eleventy("./test/stubs-virtual/", undefined, {
    config: eleventyConfig => {
      eleventyConfig.addPlugin(() => {
        eleventyConfig.addBundle("css");
      });

      eleventyConfig.addTemplate("index.njk", "Hi<link>");
    }
  });

  let results = await elev.toJSON();
  t.is(results[0].content, `Hi<link>`);
});
