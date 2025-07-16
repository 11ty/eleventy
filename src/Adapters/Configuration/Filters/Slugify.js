import slugify from "@sindresorhus/slugify";

export default function (str, options = {}) {
	options.decamelize ??= false;

	return slugify("" + str, options);
}
