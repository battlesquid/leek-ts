export const capitalize = (input: string) => {
	const [first, ...rest] = input;
	return `${first.toUpperCase()}${rest.join("")}`;
};

export const plural = (input: string, count: number, suffix: string = "s") => {
	return count === 1 ? input : `${input}${suffix}`;
};
