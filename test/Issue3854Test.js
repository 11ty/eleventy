import test from "ava";

import { spawnAsync } from "../src/Util/SpawnAsync.js";

test.skip("#3854 parent directory for content, with global data files", async (t) => {
  let result = await spawnAsync(
		"node",
		["../../../../cmd.cjs", "--to=json"],
    {
      cwd: "test/_issues/3854/app/"
    }
	);

  let json = JSON.parse(result);
  t.is(json.length, 1);
  t.is(json[0]?.content.trim(), "3854");
});
