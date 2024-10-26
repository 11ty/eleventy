import slugify from "slugify";

export default function (str, options = {}) {
	return slugify(
		"" + str,
		Object.assign(
			{
				replacement: "-",
				lower: true,
			},
			options,
		),
	);
}
