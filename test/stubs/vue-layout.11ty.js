const { createSSRApp } = require("vue");
const { renderToString } = require("@vue/server-renderer");

module.exports = async function (data) {
  var app = createSSRApp({
    template: "<p>Hello {{ data.name }}, this is a Vue template.</p>",
    data: function () {
      return { data };
    },
    // components: {
    //   'test': ComponentA
    // }
  });

  let content = await renderToString(app, { title: "Test" });
  return `<!doctype html>
<title>Test</title>
${content}`;
};
