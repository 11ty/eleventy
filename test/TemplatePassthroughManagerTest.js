import test from "ava";
import TemplatePassthroughManager from "../src/TemplatePassthroughManager";

test("Get Paths from Config", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: true,
    passthroughCopies: {
      img: true
    }
  });

  t.deepEqual(mgr.getConfigPaths(), { img: true });
});

test("Empty config paths when disabled in config", async t => {
  let mgr = new TemplatePassthroughManager();
  mgr.setConfig({
    passthroughFileCopy: false,
    passthroughCopies: {
      img: true
    }
  });

  t.deepEqual(mgr.getConfigPaths(), {});
});
