const test = require("ava");
const TemplateRender = require("../src/TemplateRender");
const TemplateConfig = require("../src/TemplateConfig");
const EleventyExtensionMap = require("../src/EleventyExtensionMap");
const { Drop } = require("liquidjs");

function getNewTemplateRender(name, inputDir, userConfig = {}) {
  let eleventyConfig = new TemplateConfig();
  for (let key in userConfig) {
    eleventyConfig.userConfig[key] = userConfig[key];
  }

  let tr = new TemplateRender(name, inputDir, eleventyConfig);
  tr.extensionMap = new EleventyExtensionMap([], eleventyConfig);
  return tr;
}

async function getPromise(resolveTo) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(resolveTo);
    });
  });
}

// Liquid
test("Liquid", (t) => {
  t.is(getNewTemplateRender("liquid").getEngineName(), "liquid");
});

test("Liquid Render Addition", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "<p>{{ number | plus: 1 }}</p>"
  );
  t.is(await fn({ number: 1 }), "<p>2</p>");
});

test("Liquid Render Raw", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "<p>{% raw %}{{name}}{% endraw %}</p>"
  );
  t.is(await fn({ name: "tim" }), "<p>{{name}}</p>");
});

test("Liquid Render Raw Multiline", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    `<p>{% raw %}
{{name}}
{% endraw %}</p>`
  );
  t.is(
    await fn({ name: "tim" }),
    `<p>
{{name}}
</p>`
  );
});

test("Liquid Render (with Helper)", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "<p>{{name | capitalize}}</p>"
  );
  t.is(await fn({ name: "tim" }), "<p>Tim</p>");
});

test("Liquid Render Include", async (t) => {
  t.is(
    getNewTemplateRender("liquid", "./test/stubs/").getEngineName(),
    "liquid"
  );

  let tr = await getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  let fn = await tr.getCompiledTemplate("<p>{% include included %}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Relative Include (dynamicPartials off)", async (t) => {
  t.is(
    getNewTemplateRender("liquid", "./test/stubs/").getEngineName(),
    "liquid"
  );

  let tr = await getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  // Important note: when inputPath is set to `liquid`, this *only* uses _includes relative paths in Liquid->compile
  let fn = await tr.getCompiledTemplate("<p>{% include ./included %}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Relative Include (dynamicPartials on)", async (t) => {
  t.is(
    getNewTemplateRender("liquid", "./test/stubs/").getEngineName(),
    "liquid"
  );

  let tr = await getNewTemplateRender("liquid", "./test/stubs/");

  // Important note: when inputPath is set to `liquid`, this *only* uses _includes relative paths in Liquid->compile
  let fn = await tr.getCompiledTemplate("<p>{% include './included' %}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Relative (current dir) Include", async (t) => {
  let tr = await getNewTemplateRender(
    "./test/stubs/relative-liquid/does_not_exist_and_thats_ok.liquid",
    "./test/stubs/",
    {
      liquidOptions: {
        dynamicPartials: false,
      },
    }
  );

  let fn = await tr.getCompiledTemplate("<p>{% include ./dir/included %}</p>");
  t.is(await fn(), "<p>TIME IS RELATIVE.</p>");
});

test("Liquid Render Relative (parent dir) Include", async (t) => {
  let tr = await getNewTemplateRender(
    "./test/stubs/relative-liquid/dir/does_not_exist_and_thats_ok.liquid",
    "./test/stubs/",
    {
      liquidOptions: {
        dynamicPartials: false,
      },
    }
  );

  let fn = await tr.getCompiledTemplate("<p>{% include ../dir/included %}</p>");
  t.is(await fn(), "<p>TIME IS RELATIVE.</p>");
});

test("Liquid Render Relative (relative include should ignore _includes dir) Include", async (t) => {
  let tr = getNewTemplateRender(
    "./test/stubs/does_not_exist_and_thats_ok.liquid",
    "./test/stubs/",
    {}
  );

  let fn = await tr.getCompiledTemplate(`<p>{% include './included' %}</p>`);
  t.is(await fn(), "<p>This is not in the includes dir.</p>");
});

test("Liquid Render Include with Liquid Suffix", async (t) => {
  t.is(
    getNewTemplateRender("liquid", "./test/stubs/").getEngineName(),
    "liquid"
  );

  let tr = await getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  let fn = await tr.getCompiledTemplate("<p>{% include included.liquid %}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include with HTML Suffix", async (t) => {
  t.is(
    getNewTemplateRender("liquid", "./test/stubs/").getEngineName(),
    "liquid"
  );

  let tr = await getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  let fn = await tr.getCompiledTemplate("<p>{% include included.html %}</p>");
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include with HTML Suffix and Data Pass in", async (t) => {
  t.is(
    getNewTemplateRender("liquid", "./test/stubs/").getEngineName(),
    "liquid"
  );

  let tr = await getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  let fn = await tr.getCompiledTemplate(
    "{% include included-data.html, myVariable: 'myValue' %}"
  );
  t.is((await fn()).trim(), "This is an include. myValue");
});

test("Liquid Custom Filter", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addFilter("prefixWithZach", function (val) {
    return "Zach" + val;
  });

  t.is(await tr._testRender("{{ 'test' | prefixWithZach }}", {}), "Zachtest");
});

test("Liquid Async Filter", async (t) => {
  let tr = getNewTemplateRender("liquid", "test/stubs");
  tr.engine.addFilter("myAsyncFilter", async function (value) {
    return new Promise((resolve, reject) => {
      setTimeout(function () {
        resolve(`HI${value}`);
      }, 100);
    });
  });

  let fn = await tr.getCompiledTemplate("{{ 'test' | myAsyncFilter }}");
  t.is((await fn()).trim(), "HItest");
});

test("Liquid Custom Tag prefixWithZach", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addTag("prefixWithZach", function (liquidEngine) {
    return {
      parse: function (tagToken, remainTokens) {
        this.str = tagToken.args; // name
      },
      render: function (scope, hash) {
        var str = liquidEngine.evalValueSync(this.str, scope); // 'alice'
        return Promise.resolve("Zach" + str); // 'Alice'
      },
    };
  });

  t.is(
    await tr._testRender("{% prefixWithZach name %}", { name: "test" }),
    "Zachtest"
  );
});

test("Liquid Custom Tag postfixWithZach", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addTag("postfixWithZach", function (liquidEngine) {
    return {
      parse: function (tagToken, remainTokens) {
        this.str = tagToken.args;
      },
      render: async function (scope, hash) {
        var str = await liquidEngine.evalValue(this.str, scope);
        return Promise.resolve(str + "Zach");
      },
    };
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", { name: "test" }),
    "testZach"
  );
});

test("Liquid Custom Tag Unquoted String", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addTag("testUnquotedStringTag", function (liquidEngine) {
    return {
      parse: function (tagToken, remainTokens) {
        this.str = tagToken.args;
      },
      render: function (scope, hash) {
        return Promise.resolve(this.str + "Zach");
      },
    };
  });

  t.is(
    await tr._testRender(
      "{% testUnquotedStringTag _posts/2016-07-26-name-of-post.md %}",
      { name: "test" }
    ),
    "_posts/2016-07-26-name-of-post.mdZach"
  );
});

test("Liquid addTag errors", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  t.throws(() => {
    tr.engine.addTag("badSecondArgument", {});
  });
});

test("Liquid addTags", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addCustomTags({
    postfixWithZach: function (liquidEngine) {
      return {
        parse: function (tagToken, remainTokens) {
          this.str = tagToken.args;
        },
        render: async function (scope, hash) {
          var str = await liquidEngine.evalValue(this.str, scope);
          return Promise.resolve(str + "Zach");
        },
      };
    },
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", { name: "test" }),
    "testZach"
  );
});

test("Liquid Shortcode", async (t) => {
  t.plan(3);

  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function (str) {
    // Data in context
    t.is(this.page.url, "/hi/");
    t.not(this.name, "test");

    return str + "Zach";
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", {
      name: "test",
      page: {
        url: "/hi/",
      },
    }),
    "testZach"
  );
});

test("Liquid Shortcode returns promise", async (t) => {
  t.plan(2);

  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function (str) {
    // Data in context
    t.is(this.page.url, "/hi/");

    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(str + "Zach");
      });
    });
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", {
      name: "test",
      page: {
        url: "/hi/",
      },
    }),
    "testZach"
  );
});

test("Liquid Shortcode returns promise (await inside)", async (t) => {
  t.plan(2);

  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", async function (str) {
    // Data in context
    t.is(this.page.url, "/hi/");

    return await getPromise(str + "Zach");
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", {
      name: "test",
      page: {
        url: "/hi/",
      },
    }),
    "testZach"
  );
});

test("Liquid Shortcode returns promise (no await inside)", async (t) => {
  t.plan(2);

  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", async function (str) {
    // Data in context
    t.is(this.page.url, "/hi/");
    return getPromise(str + "Zach");
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", {
      name: "test",
      page: {
        url: "/hi/",
      },
    }),
    "testZach"
  );
});

test("Liquid Shortcode Safe Output", async (t) => {
  t.plan(2);
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function (str) {
    // Data in context
    t.is(this.page.url, "/hi/");
    return `<span>${str}</span>`;
  });

  t.is(
    await tr._testRender("{% postfixWithZach name %}", {
      name: "test",
      page: {
        url: "/hi/",
      },
    }),
    "<span>test</span>"
  );
});

test("Liquid Paired Shortcode", async (t) => {
  t.plan(2);
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function (content, str) {
    // Data in context
    t.is(this.page.url, "/hi/");
    return str + content + "Zach";
  });

  t.is(
    await tr._testRender(
      "{% postfixWithZach name %}Content{% endpostfixWithZach %}",
      {
        name: "test",
        page: {
          url: "/hi/",
        },
      }
    ),
    "testContentZach"
  );
});

test("Liquid Async Paired Shortcode", async (t) => {
  t.plan(2);
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function (content, str) {
    // Data in context
    t.is(this.page.url, "/hi/");
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(str + content + "Zach");
      });
    });
  });

  t.is(
    await tr._testRender(
      "{% postfixWithZach name %}Content{% endpostfixWithZach %}",
      {
        name: "test",
        page: {
          url: "/hi/",
        },
      }
    ),
    "testContentZach"
  );
});

test("Liquid Render Include Subfolder", async (t) => {
  let tr = await getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  let fn = await tr.getCompiledTemplate(
    `<p>{% include subfolder/included.liquid %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder HTML", async (t) => {
  let tr = await getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  let fn = await tr.getCompiledTemplate(
    `<p>{% include subfolder/included.html %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder No file extension", async (t) => {
  let tr = await getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  let fn = await tr.getCompiledTemplate(
    `<p>{% include subfolder/included %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

// Related to https://github.com/harttle/liquidjs/issues/61
// Note that we swapped the dynamicPartials default in Eleventy 1.0 from false to true
test("Liquid Render Include Subfolder Single quotes", async (t) => {
  let tr = await getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include 'subfolder/included.liquid' %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Double quotes", async (t) => {
  let tr = await getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include "subfolder/included.liquid" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Single quotes HTML", async (t) => {
  let tr = await getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include 'subfolder/included.html' %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Double quotes HTML", async (t) => {
  let fn = await getNewTemplateRender(
    "liquid",
    "./test/stubs/"
  ).getCompiledTemplate(`<p>{% include "subfolder/included.html" %}</p>`);
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Single quotes No file extension", async (t) => {
  let fn = await getNewTemplateRender(
    "liquid",
    "./test/stubs/"
  ).getCompiledTemplate(`<p>{% include 'subfolder/included' %}</p>`);
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Double quotes No file extension", async (t) => {
  let fn = await getNewTemplateRender(
    "liquid",
    "./test/stubs/"
  ).getCompiledTemplate(`<p>{% include "subfolder/included" %}</p>`);
  t.is(await fn(), "<p>This is an include.</p>");
});
/* End tests related to dynamicPartials */

test("Liquid Options Overrides", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      dynamicPartials: false,
    },
  });

  let options = tr.engine.getLiquidOptions();
  t.is(options.dynamicPartials, false);
});

test("Liquid Render Include Subfolder Single quotes no extension dynamicPartials true", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include 'subfolder/included' %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Single quotes (relative include current dir) dynamicPartials true", async (t) => {
  let tr = getNewTemplateRender(
    "./test/stubs/does_not_exist_and_thats_ok.liquid",
    "./test/stubs/",
    {}
  );
  let fn = await tr.getCompiledTemplate(
    `<p>{% include './relative-liquid/dir/included' %}</p>`
  );
  t.is(await fn(), "<p>TIME IS RELATIVE.</p>");
});

test("Liquid Render Include Subfolder Single quotes (relative include parent dir) dynamicPartials true", async (t) => {
  let tr = getNewTemplateRender(
    "./test/stubs/subfolder/does_not_exist_and_thats_ok.liquid",
    "./test/stubs/",
    {}
  );
  let fn = await tr.getCompiledTemplate(
    `<p>{% include '../relative-liquid/dir/included' %}</p>`
  );
  t.is(await fn(), "<p>TIME IS RELATIVE.</p>");
});

test("Liquid Render Include Subfolder Double quotes no extension dynamicPartials true", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include "subfolder/included" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Single quotes dynamicPartials true", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include 'subfolder/included.liquid' %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Double quotes dynamicPartials true", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include "subfolder/included.liquid" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Single quotes HTML dynamicPartials true", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include 'subfolder/included.html' %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Double quotes HTML dynamicPartials true", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include "subfolder/included.html" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Single quotes HTML dynamicPartials true, data passed in", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include 'subfolder/included.html', myVariable: 'myValue' %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render Include Subfolder Double quotes HTML dynamicPartials true, data passed in", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  let fn = await tr.getCompiledTemplate(
    `<p>{% include "subfolder/included.html", myVariable: "myValue" %}</p>`
  );
  t.is(await fn(), "<p>This is an include.</p>");
});

test("Liquid Render: with Library Override", async (t) => {
  const tr = getNewTemplateRender("liquid");
  const { Liquid } = require("liquidjs");
  tr.engine.setLibrary(new Liquid());

  const fn = await tr.getCompiledTemplate("<p>{{name | capitalize}}</p>");
  t.is(await fn({ name: "tim" }), "<p>Tim</p>");
});

test("Liquid Paired Shortcode with Tag Inside", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function (content, str) {
    return str + content + "Zach";
  });

  t.is(
    await tr._testRender(
      "{% postfixWithZach name %}Content{% if tester %}If{% endif %}{% endpostfixWithZach %}",
      { name: "test", tester: true }
    ),
    "testContentIfZach"
  );
});

test("Liquid Nested Paired Shortcode", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addPairedShortcode("postfixWithZach", function (content, str) {
    return str + content + "Zach";
  });

  t.is(
    await tr._testRender(
      "{% postfixWithZach name %}Content{% postfixWithZach name2 %}Content{% endpostfixWithZach %}{% endpostfixWithZach %}",
      { name: "test", name2: "test2" }
    ),
    "testContenttest2ContentZachZach"
  );
});

test("Liquid Shortcode Multiple Args", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function (str, str2) {
    return str + str2 + "Zach";
  });

  t.is(
    await tr._testRender("{% postfixWithZach name other %}", {
      name: "test",
      other: "howdy",
    }),
    "testhowdyZach"
  );
});

test("Liquid Include Scope Leak", async (t) => {
  t.is(
    getNewTemplateRender("liquid", "./test/stubs/").getEngineName(),
    "liquid"
  );

  // This is by design, `include` assigns value to its parent scope,
  // use `{% render %}` for separated, clean scope
  // see: https://github.com/harttle/liquidjs/issues/404#issuecomment-955660149
  let fn = await getNewTemplateRender(
    "liquid",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{% include 'scopeleak' %}{{ test }}</p>");
  t.is(await fn({ test: 1 }), "<p>22</p>");
});

test("Liquid Render Scope Leak", async (t) => {
  t.is(
    getNewTemplateRender("liquid", "./test/stubs/").getEngineName(),
    "liquid"
  );

  let fn = await getNewTemplateRender(
    "liquid",
    "./test/stubs/"
  ).getCompiledTemplate("<p>{% render 'scopeleak' %}{{ test }}</p>");
  t.is(await fn({ test: 1 }), "<p>21</p>");
});

// Note: this strictFilters default changed in 1.0 from false to true
test("Liquid Missing Filter Issue #183 (no strictFilters)", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/", {
    liquidOptions: {
      strictFilters: false,
    },
  });

  try {
    await tr._testRender("{{ 'test' | prefixWithZach }}", {});
    t.pass("Did not error.");
  } catch (e) {
    t.fail("Threw an error.");
  }
});

// Note: this strictFilters default changed in 1.0 from false to true
test("Liquid Missing Filter Issue #183", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");

  try {
    await tr._testRender("{{ 'test' | prefixWithZach }}", {});
    t.fail("Did not error.");
  } catch (e) {
    t.pass("Threw an error.");
  }
});

test("Issue 258: Liquid Render Date", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "<p>{{ myDate }}</p>"
  );
  let dateStr = await fn({ myDate: new Date(Date.UTC(2016, 0, 1, 0, 0, 0)) });
  t.is(dateStr.slice(0, 3), "<p>");
  t.is(dateStr.slice(-4), "</p>");
  t.not(dateStr.slice(2, 1), '"');
});

test("Issue 347: Liquid addTags with space in argument", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addCustomTags({
    issue347CustomTag: function (liquidEngine) {
      return {
        parse: function (tagToken, remainTokens) {
          this.str = tagToken.args;
        },
        render: async function (scope, hash) {
          var str = await liquidEngine.evalValue(this.str, scope);
          return Promise.resolve(str + "Zach");
        },
      };
    },
  });

  t.is(
    await tr._testRender("{% issue347CustomTag 'te st' %}", {
      name: "slkdjflksdjf",
    }),
    "te stZach"
  );
});

test("Issue 347: Liquid Shortcode, string argument", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue347", function (str) {
    return str + "Zach";
  });

  t.is(
    await tr._testRender("{% issue347 'test' %}", { name: "alkdsjfkslja" }),
    "testZach"
  );
});

test("Issue 347: Liquid Shortcode string argument with space, double quotes", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue347b", function (str) {
    return str + "Zach";
  });

  t.is(
    await tr._testRender('{% issue347b "test 2" "test 3" %}', {
      name: "alkdsjfkslja",
    }),
    "test 2Zach"
  );
});

test("Issue 347: Liquid Shortcode string argument with space, single quotes", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue347", function (str) {
    return str + "Zach";
  });

  t.is(
    await tr._testRender("{% issue347 'test 2' %}", { name: "alkdsjfkslja" }),
    "test 2Zach"
  );
});

test("Issue 347: Liquid Shortcode string argument with space, combination of quotes", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue347", function (str, str2) {
    return str + str2 + "Zach";
  });

  t.is(
    await tr._testRender("{% issue347 'test 2' \"test 3\" %}", {
      name: "alkdsjfkslja",
    }),
    "test 2test 3Zach"
  );
});

test("Issue 347: Liquid Shortcode multiple arguments, comma separated", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue347", function (str, str2) {
    return str + str2 + "Zach";
  });

  t.is(
    await tr._testRender("{% issue347 'test 2', \"test 3\" %}", {
      name: "alkdsjfkslja",
    }),
    "test 2test 3Zach"
  );
});

test("Issue 347: Liquid Shortcode multiple arguments, comma separated, one is an integer", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue347", function (str, str2) {
    return str + str2 + "Zach";
  });

  t.is(
    await tr._testRender("{% issue347 'test 2', 3 %}", {
      name: "alkdsjfkslja",
    }),
    "test 23Zach"
  );
});

test("Issue 347: Liquid Shortcode multiple arguments, comma separated, one is a float", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue347", function (str, str2) {
    return str + str2 + "Zach";
  });

  t.is(
    await tr._testRender("{% issue347 'test 2', 3.23 %}", {
      name: "alkdsjfkslja",
    }),
    "test 23.23Zach"
  );
});

test("Issue 347: Liquid Shortcode boolean argument", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue347", function (bool) {
    return bool ? "Zach" : "Not Zach";
  });

  t.is(
    await tr._testRender("{% issue347 true %}", { name: "alkdsjfkslja" }),
    "Zach"
  );
  t.is(
    await tr._testRender("{% issue347 false %}", { name: "alkdsjfkslja" }),
    "Not Zach"
  );
});

test("Issue 347: Liquid Paired Shortcode with Spaces", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addPairedShortcode(
    "postfixWithZach",
    function (content, str1, num, str2) {
      return str1 + num + str2 + content + "Zach";
    }
  );

  t.is(
    await tr._testRender(
      "{% postfixWithZach 'My Name', 1234, \"Other\" %}Content{% endpostfixWithZach %}",
      { name: "test" }
    ),
    "My Name1234OtherContentZach"
  );
});

test("Liquid Render with dash variable Issue #567", async (t) => {
  let tr = getNewTemplateRender("liquid");

  let fn = await tr.getCompiledTemplate("<p>{{ my-global-name }}</p>");
  t.is(await fn({ "my-global-name": "Zach" }), "<p>Zach</p>");
});

test("Issue 600: Liquid Shortcode argument page.url", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue600", function (str) {
    return str + "Zach";
  });

  t.is(
    await tr._testRender("{% issue600 page.url %}", {
      page: { url: "alkdsjfkslja" },
    }),
    "alkdsjfksljaZach"
  );
});

test("Issue 600: Liquid Shortcode argument with dashes", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue600b", function (str) {
    return str + "Zach";
  });

  t.is(
    await tr._testRender("{% issue600b page-url %}", {
      "page-url": "alkdsjfkslja",
    }),
    "alkdsjfksljaZach"
  );
});

test("Issue 600: Liquid Shortcode argument with underscores", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("issue600c", function (str) {
    return str + "Zach";
  });

  t.is(
    await tr._testRender("{% issue600c page_url %}", {
      page_url: "alkdsjfkslja",
    }),
    "alkdsjfksljaZach"
  );
});

test("Issue 611: Run a function", async (t) => {
  // function calls in Nunjucks can be replaced by custom Drops
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  class CustomDrop extends Drop {
    valueOf() {
      return "alkdsjfksljaZach";
    }
  }
  t.is(
    await tr._testRender("{{ test }}", {
      test: new CustomDrop(),
    }),
    "alkdsjfksljaZach"
  );
});

test("Liquid Shortcode (with sync function, error throwing)", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", function (str) {
    throw new Error("Liquid Shortcode (with sync function, error throwing)");
  });

  let error = await t.throwsAsync(async () => {
    await tr._testRender("{% postfixWithZach name %}", { name: "test" });
  });
  t.true(
    error.message.indexOf(
      "Liquid Shortcode (with sync function, error throwing)"
    ) > -1
  );
});

test("Liquid Shortcode (with async function, error throwing)", async (t) => {
  let tr = getNewTemplateRender("liquid", "./test/stubs/");
  tr.engine.addShortcode("postfixWithZach", async function (str) {
    throw new Error("Liquid Shortcode (with async function, error throwing)");
  });

  let error = await t.throwsAsync(async () => {
    await tr._testRender("{% postfixWithZach name %}", { name: "test" });
  });
  t.true(
    error.message.indexOf(
      "Liquid Shortcode (with async function, error throwing)"
    ) > -1
  );
});

test("Liquid Render a false #1069", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "{{ falseValue }}"
  );
  t.is(await fn({ falseValue: false }), "false");
});

test("Liquid Render Square Brackets #680 dash single quotes", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "<p>{{ test['hey-a'] }}</p>"
  );
  t.is(await fn({ test: { "hey-a": 1 } }), "<p>1</p>");
});

test("Liquid Render Square Brackets #680 dash single quotes spaces", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "<p>{{ test[ 'hey-a' ] }}</p>"
  );
  t.is(await fn({ test: { "hey-a": 1 } }), "<p>1</p>");
});

test("Liquid Render Square Brackets #680 dash double quotes", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    '<p>{{ test["hey-a"] }}</p>'
  );
  t.is(await fn({ test: { "hey-a": 1 } }), "<p>1</p>");
});

test("Liquid Render Square Brackets #680 dash double quotes spaces", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    '<p>{{ test[ "hey-a" ] }}</p>'
  );
  t.is(await fn({ test: { "hey-a": 1 } }), "<p>1</p>");
});

test("Liquid Render Square Brackets #680 variable reference", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "<p>{{ test[ref] }}</p>"
  );
  t.is(await fn({ test: { "hey-a": 1 }, ref: "hey-a" }), "<p>1</p>");
});

test("Liquid Render Square Brackets #680 variable reference array", async (t) => {
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "<p>{{ test[ref[0]] }}</p>"
  );
  t.is(await fn({ test: { "hey-a": 1 }, ref: ["hey-a"] }), "<p>1</p>");
});

test("Liquid bypass compilation", async (t) => {
  let tr = getNewTemplateRender("liquid");

  t.is(tr.engine.needsCompilation("<p>{{ me }}</p>"), true);
  t.is(
    tr.engine.needsCompilation("<p>{% comment %}{% endcomment %}</p>"),
    true
  );
  t.is(tr.engine.needsCompilation("<p>test</p>"), false);
});

test("Liquid reverse filter in {{ }}", async (t) => {
  // https://liquidjs.com/filters/reverse.html
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "{{ test | reverse | join: ',' }}"
  );
  t.is(await fn({ test: [1, 2, 3] }), "3,2,1");
});

test("Liquid reverse filter in {% for %}", async (t) => {
  // https://liquidjs.com/tags/for.html#reversed
  let fn = await getNewTemplateRender("liquid").getCompiledTemplate(
    "{% for num in test reversed %}{{ num }}{% endfor %}"
  );
  t.is(await fn({ test: [1, 2, 3] }), "321");
});

test("Liquid Parse for Symbols", async (t) => {
  let tr = getNewTemplateRender("liquid");
  let engine = tr.engine;

  t.deepEqual(engine.parseForSymbols("<p>{{ name }}</p>"), ["name"]);
  t.deepEqual(engine.parseForSymbols("<p>{{ eleventy.deep.nested }}</p>"), [
    "eleventy.deep.nested",
  ]);
  t.deepEqual(engine.parseForSymbols("<p>{{ a }} {{ b }}</p>"), ["a", "b"]);
  t.deepEqual(
    engine.parseForSymbols("<p>{% if true %}{{ c }}{% endif %}</p>"),
    ["c"]
  );
  t.deepEqual(
    engine.parseForSymbols("<p>{% if false %}{{ c }}{% endif %}</p>"),
    ["c"]
  );

  t.deepEqual(engine.parseForSymbols("{{ collections.all[0] }}>"), [
    // Note that the Nunjucks parser returns collections.all
    "collections.all[0]",
  ]);
  t.deepEqual(engine.parseForSymbols("{{ collections.mine }}>"), [
    "collections.mine",
  ]);

  t.deepEqual(engine.parseForSymbols("{{ collections.mine | test }}>"), [
    "collections.mine",
  ]);
});
