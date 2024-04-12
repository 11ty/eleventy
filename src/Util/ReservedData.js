class ReservedData {
	static properties = ["page", "content", "collections"];

	static getReservedKeys(data) {
		return this.properties.filter((key) => {
			return key in data;
		});
	}
}

export default ReservedData;
