import slugify from "@sindresorhus/slugify";

export default function (str, options = {}) {
	return slugify(
		"" + str,
		Object.assign(
			{
				// lowercase: true, // default
				decamelize: false,
			},
			options,
		),
	);
}
