import { spawn } from "node:child_process";
import { withResolvers } from "./PromiseUtil.js";

export function spawnAsync(command, args, options) {
	let { promise, resolve, reject } = withResolvers();

	const cmd = spawn(command, args, options);
	cmd.stdout.on("data", (data) => {
		resolve(data.toString("utf8"));
	});

	cmd.stderr.on("data", (data) => {
		reject(data.toString("utf8"));
	});

	cmd.on("close", (code) => {
		if (code === 1) {
			reject("Internal error: process closed with error exit code.");
		} else {
			resolve();
		}
	});

	return promise;
}
