const { createSSRApp } = require("vue");
const { renderToString } = require("@vue/server-renderer");

module.exports = async function (templateData) {
  var app = createSSRApp({
    template: "<p>Hello {{ data.name }}, this is a Vue template.</p>",
    data: function () {
      return {
        data: templateData,
      };
    },
    // components: {
    //   'test': ComponentA
    // }
  });

  return renderToString(app);
};
