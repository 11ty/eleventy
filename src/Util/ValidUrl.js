export default function isValidUrl(url) {
	try {
		new URL(url);
		return true;
	} catch (e) {
		// invalid url OR local path
		return false;
	}
}
