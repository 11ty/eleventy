import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";

export default async function (templateData) {
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
}
