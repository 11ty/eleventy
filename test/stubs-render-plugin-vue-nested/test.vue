<template>
  <div>
    <div v-html="content"></div>
    <style v-html="css"></style>
  </div>
</template>
<style>
body {
  color: red;
}
</style>
<script>
export default {
  props: {},
  computed: {
    css: function() {
      return this.getVueComponentCssForPage(this.page.url);
    }
  },

  // Skip the data cascade for this template
  eleventyDataKey: [],

  // Warning, how to use .page.url inside of data when it isn’t available in getExtraDataFromFile
  serverPrefetch: async function() {
    let data = {
      vueData: 1,
      innerObj: {
        hi: 2
      }
    }
    let input = `# This is {{ vueData }}.
{% renderFile "./test/stubs-render-plugin-vue-nested/_includes/include.vue", innerObj %}`;
    this.content = await this.renderTemplate(input, "liquid,md", data);
  },
  components: {}
}
</script>