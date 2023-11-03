import test from "ava";
import Eleventy from "../src/Eleventy.js";

test("Custom Front Matter Parsing Options (using JavaScript node-retrieve-globals)", async (t) => {
  let elev = new Eleventy("./test/stubs/script-frontmatter/test.njk", "./_site");
  elev.setIsVerbose(false);

  let result = await elev.toJSON();

  t.deepEqual(result.length, 1);

  t.is(result[0]?.content, `<div>Hi</div><div>Bye</div>`);
});
