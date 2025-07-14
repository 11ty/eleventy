import fs from "node:fs";
import corePkg from "../../package.json" with { type: "json" };

// assign new version in local package.json from core package.json
import clientPkg from "./package.json" with { type: "json" };
clientPkg.version = corePkg.version;

fs.writeFileSync("./package.json", JSON.stringify(clientPkg, null, 2), "utf8");
console.log(`[11ty/bundle/client] Updated @11ty/client package version to ${corePkg.version}`);
