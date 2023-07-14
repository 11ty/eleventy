const test = require("ava");
const NetlifyRedirects = require("../src/Plugins/Serverless/NetlifyRedirects");

test("Starter", (t) => {
  let r = new NetlifyRedirects("possum");
  let newRedirects = r.getNewRedirects(
    {
      "/dynamic-path/": "./test.njk",
    },
    "/.netlify/builders/"
  );

  t.deepEqual(r.getResults(newRedirects), {
    redirects: [
      {
        _generated_by_eleventy_serverless: "possum",
        force: true,
        from: "/dynamic-path/",
        status: 200,
        to: "/.netlify/builders/possum",
      },
    ],
  });
});

test("Delete redirects on empty", (t) => {
  let r = new NetlifyRedirects("possum");
  let newRedirects = r.getNewRedirects({}, "/.netlify/builders/");

  t.deepEqual(r.getResults(newRedirects), {});
});

test("Add to Existing Content", (t) => {
  let r = new NetlifyRedirects("possum");
  let newRedirects = r.getNewRedirects(
    {
      "/dynamic-path/": "./test.njk",
    },
    "/.netlify/builders/"
  );

  let results = r.getResults(newRedirects, {
    redirects: [
      {
        force: true,
        from: "/admin/*",
        status: 200,
      },
    ],
  });

  t.deepEqual(results, {
    redirects: [
      {
        _generated_by_eleventy_serverless: "possum",
        force: true,
        from: "/dynamic-path/",
        status: 200,
        to: "/.netlify/builders/possum",
      },
      {
        force: true,
        from: "/admin/*",
        status: 200,
      },
    ],
  });
});

test("Add to Existing Content, exists already—keep order (serverless first)", (t) => {
  let r = new NetlifyRedirects("possum");
  let newRedirects = r.getNewRedirects(
    {
      "/dynamic-path/": "./test.njk",
    },
    "/.netlify/builders/"
  );

  let results = r.getResults(newRedirects, {
    redirects: [
      {
        _generated_by_eleventy_serverless: "possum",
        force: true,
        from: "/dynamic-path/",
        status: 200,
        to: "/.netlify/builders/possum",
      },
      {
        force: true,
        from: "/admin/*",
        status: 200,
      },
    ],
  });

  t.deepEqual(results, {
    redirects: [
      {
        _generated_by_eleventy_serverless: "possum",
        force: true,
        from: "/dynamic-path/",
        status: 200,
        to: "/.netlify/builders/possum",
      },
      {
        force: true,
        from: "/admin/*",
        status: 200,
      },
    ],
  });
});

test("Add to Existing Content, exists already—keep order (serverless second)", (t) => {
  let r = new NetlifyRedirects("possum");
  let newRedirects = r.getNewRedirects(
    {
      "/dynamic-path/": "./test.njk",
    },
    "/.netlify/builders/"
  );

  let results = r.getResults(newRedirects, {
    redirects: [
      {
        force: true,
        from: "/admin/*",
        status: 200,
      },
      {
        _generated_by_eleventy_serverless: "possum",
        force: true,
        from: "/dynamic-path/",
        status: 200,
        to: "/.netlify/builders/possum",
      },
    ],
  });

  t.deepEqual(results, {
    redirects: [
      {
        force: true,
        from: "/admin/*",
        status: 200,
      },
      {
        _generated_by_eleventy_serverless: "possum",
        force: true,
        from: "/dynamic-path/",
        status: 200,
        to: "/.netlify/builders/possum",
      },
    ],
  });
});

test("Remove stale path", (t) => {
  let r = new NetlifyRedirects("possum");
  let newRedirects = r.getNewRedirects({}, "/.netlify/builders/");

  let results = r.getResults(newRedirects, {
    redirects: [
      {
        force: true,
        from: "/admin/*",
        status: 200,
      },
      {
        _generated_by_eleventy_serverless: "possum",
        force: true,
        from: "/dynamic-path/",
        status: 200,
        to: "/.netlify/builders/possum",
      },
    ],
  });

  t.deepEqual(results, {
    redirects: [
      {
        force: true,
        from: "/admin/*",
        status: 200,
      },
    ],
  });
});

test("Additional test for #2392", (t) => {
  let r = new NetlifyRedirects("possum");
  let newRedirects = r.getNewRedirects(
    {
      "/admin/*": "./test.njk",
    },
    "/.netlify/builders/"
  );

  let results = r.getResults(newRedirects, {
    redirects: [
      {
        force: true,
        from: "/admin/*",
        to: "/.netlify/builders/possum",
        _generated_by_eleventy_serverless: "possum",
        status: 200,
        conditions: {
          Role: ["admin"],
        },
      },
      {
        force: true,
        from: "/admin/*",
        to: "/login/",
        status: 401,
      },
    ],
  });

  t.deepEqual(results, {
    redirects: [
      {
        force: true,
        from: "/admin/*",
        to: "/.netlify/builders/possum",
        _generated_by_eleventy_serverless: "possum",
        status: 200,
        conditions: {
          Role: ["admin"],
        },
      },
      {
        force: true,
        from: "/admin/*",
        to: "/login/",
        status: 401,
      },
    ],
  });
});
