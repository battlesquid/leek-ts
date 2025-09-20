export const capitalize = (input: string) => {
	const [first, ...rest] = input;
	return `${first.toUpperCase()}${rest.join("")}`;
};

export const pluralize = (input: string, count: number) => {
	return count === 1 ? input : `${input}s`;
};
