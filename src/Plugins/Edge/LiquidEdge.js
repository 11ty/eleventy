const { Tokenizer, evalToken } = require("liquidjs");

function rawContentLiquidTag(liquidEngine, renderFn, tagName) {
  // via https://github.com/harttle/liquidjs/blob/b5a22fa0910c708fe7881ef170ed44d3594e18f3/src/builtin/tags/raw.ts
  return {
    parse: function (tagToken, remainTokens) {
      this.name = tagToken.name;
      this.args = [];
      this.tokens = [];

      const tokenizer = new Tokenizer(tagToken.args);
      this.args = [];
      while (!tokenizer.end()) {
        let value = tokenizer.readValue();
        if (!value) {
          break;
        }
        this.args.push(value);
      }

      var stream = liquidEngine.parser
        .parseStream(remainTokens)
        .on("token", (token) => {
          if (token.name === "end" + tagName) stream.stop();
          else this.tokens.push(token);
        })
        .on("end", () => {
          throw new Error(`tag ${tagToken.getText()} not closed`);
        });

      stream.start();
    },
    render: function* (ctx, emitter) {
      let normalizedContext = {};
      if (ctx) {
        normalizedContext.page = ctx.get(["page"]);
        normalizedContext.eleventy = ctx.get(["eleventy"]);
      }

      let argArray = [];
      for (let arg of this.args) {
        let b = yield evalToken(arg, ctx);
        argArray.push(b);
      }

      let body = this.tokens.map((token) => token.getText()).join("");

      return renderFn.call(normalizedContext, tagName, body, ...argArray);
    },
  };
}

module.exports = rawContentLiquidTag;
