import test from "ava";
import TransformsUtil from "../src/Util/TransformsUtil.js";

test("TransformsUtil.runall", async (t) => {
  t.is(await TransformsUtil.runAll("Test content", {}, {
    test: function(content) {
      return content + "Overridden!"
    }
  }), "Test contentOverridden!");
});
