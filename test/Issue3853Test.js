import test from "ava";
import path from "node:path";

import { spawnAsync } from "../src/Util/SpawnAsync.js";

test("#3853 absolute path input should strip output from permalink", async (t) => {
  let input = path.join(process.cwd(), "test/_issues/3853/deeper");
  let output = path.join(process.cwd(), "test/_issues/3853/public/site");
  let result = await spawnAsync(
		"node",
		["../../../cmd.cjs", `--input=${input}`, `--output=${output}`, "--to=json"],
    {
      cwd: "test/_issues/3853/"
    }
	);

  let json = JSON.parse(result);

  t.is(json.length, 1);
  t.is(json[0]?.outputPath, path.join(output, "index.html"));
  t.is(json[0]?.content.trim(), "3853");
});
