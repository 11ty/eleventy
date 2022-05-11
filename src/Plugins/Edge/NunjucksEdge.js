function rawContentNunjucksTag(nunjucks, nunjucksEnv, renderFn, tagName) {
  return new (function () {
    this.tags = [tagName];

    this.parse = function (parser, nodes) {
      var tok = parser.nextToken();

      var args = parser.parseSignature(true, true);
      const begun = parser.advanceAfterBlockEnd(tok.value);

      // This code was ripped from the Nunjucks parser for `raw`
      // https://github.com/mozilla/nunjucks/blob/fd500902d7c88672470c87170796de52fc0f791a/nunjucks/src/parser.js#L655
      const endTagName = "end" + tagName;
      // Look for upcoming raw blocks (ignore all other kinds of blocks)
      const rawBlockRegex = new RegExp(
        "([\\s\\S]*?){%\\s*(" + tagName + "|" + endTagName + ")\\s*(?=%})%}"
      );
      let rawLevel = 1;
      let str = "";
      let matches = null;

      // Exit when there's nothing to match
      // or when we've found the matching "endraw" block
      while (
        (matches = parser.tokens._extractRegex(rawBlockRegex)) &&
        rawLevel > 0
      ) {
        const all = matches[0];
        const pre = matches[1];
        const blockName = matches[2];

        // Adjust rawlevel
        if (blockName === tagName) {
          rawLevel += 1;
        } else if (blockName === endTagName) {
          rawLevel -= 1;
        }

        // Add to str
        if (rawLevel === 0) {
          // We want to exclude the last "endraw"
          str += pre;
          // Move tokenizer to beginning of endraw block
          parser.tokens.backN(all.length - pre.length);
        } else {
          str += all;
        }
      }

      let body = new nodes.Output(begun.lineno, begun.colno, [
        new nodes.TemplateData(begun.lineno, begun.colno, str),
      ]);
      return new nodes.CallExtensionAsync(this, "run", args, [body]);
    };

    this.run = function (...args) {
      let resolve = args.pop();
      let body = args.pop();
      let [context, arg1, arg2, ...argArray] = args;

      let normalizedContext = {};
      if (context.ctx && context.ctx.page) {
        normalizedContext.ctx = context.ctx;
        normalizedContext.page = context.ctx.page;
      }
      if (context.ctx && context.ctx.eleventy) {
        normalizedContext.eleventy = context.ctx.eleventy;
      }

      body(function (e, bodyContent) {
        if (e) {
          resolve(
            new Error(
              `Error with Nunjucks paired shortcode \`${tagName}\`: ${e.message}`
            )
          );
        }

        Promise.resolve(
          renderFn.call(
            normalizedContext,
            tagName,
            bodyContent,
            arg1, // lang when edge(lang, data) and data when edge(data)
            arg2, // data when edge(lang, data) (all handled downstream)
            { nunjucks, nunjucksEnv }
          )
        )
          .then(function (returnValue) {
            resolve(null, new nunjucks.runtime.SafeString(returnValue));
          })
          .catch(function (e) {
            resolve(
              new Error(
                `Error with Nunjucks paired shortcode \`${tagName}\`: ${e.message}`
              ),
              null
            );
          });
      });
    };
  })();
}

module.exports = rawContentNunjucksTag;
