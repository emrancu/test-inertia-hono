export const Str = {
	snake: (str: string, delimiter = "_") => {
		return str.toLowerCase().replace(/\s+/g, delimiter);
	},

	contains: (
		haystack: string,
		needles: string | string[],
		ignoreCase = false,
	) => {
		let finalNeedles = Array.isArray(needles) ? needles : [needles];
		let finalHaystack = haystack;
		if (ignoreCase) {
			finalHaystack = haystack.toLowerCase();
			finalNeedles = finalNeedles.map((needle) => needle.toLowerCase());
		}

		return finalNeedles.some((needle) => finalHaystack.includes(needle));
	},
	uuid: () => {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
			const random = (Math.random() * 16) | 0;
			const value = char === "x" ? random : (random & 0x3) | 0x8;
			return value.toString(16);
		});
	},
	slug: (title: string, separator = "-") => {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, separator)
			.replace(new RegExp(`^${separator}|${separator}$`, "g"), "");
	},
	toQueryParams(params: any) {
		for (const key in params) {
			if (params[key] === void 0) {
				delete params[key];
			}
		}

		return new URLSearchParams(params).toString();
	},
};
