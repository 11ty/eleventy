const Vue = require("vue");
const renderer = require("vue-server-renderer").createRenderer({
  template: `<!doctype html>
<title>{{ title }}</title>
<!--vue-ssr-outlet-->`
});

module.exports = async function(data) {
  var app = new Vue({
    template: "<p>Hello {{ data.name }}, this is a Vue template.</p>",
    data: function() {
      return { data };
    }
    // components: {
    //   'test': ComponentA
    // }
  });

  return renderer.renderToString(app, { title: "Test" });
};
