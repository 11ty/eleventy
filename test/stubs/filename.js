class Test {
	compile() {
		return function(data) {
			return `<p>${data.name}</p>`;
		}
	}
}

module.exports = Test;