// This has been deprecated since v1.0.0
// https://www.11ty.dev/docs/filters/slug/
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
