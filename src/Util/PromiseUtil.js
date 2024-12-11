function withResolvers() {
	if ("withResolvers" in Promise) {
		return Promise.withResolvers();
	}

	let resolve;
	let reject;
	let promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

export { withResolvers };
