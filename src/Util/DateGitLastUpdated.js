import { spawnAsync } from "./SpawnAsync.js";

async function getGitLastUpdatedTimeStamp(filePath) {
	try {
		let timestamp = await spawnAsync(
			"git",
			// Formats https://www.git-scm.com/docs/git-log#_pretty_formats
			// %at author date, UNIX timestamp
			["log", "-1", "--format=%at", filePath],
		);
		return parseInt(timestamp, 10) * 1000;
	} catch (e) {
		// do nothing
	}
}

// return a Date
export default async function (inputPath) {
	let timestamp = await getGitLastUpdatedTimeStamp(inputPath);
	if (timestamp) {
		return new Date(timestamp);
	}
}
