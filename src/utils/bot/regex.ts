export const URL_REGEX =
	/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
export const VERIFY_REGEX =
	/(?<name>.+?)\s?[|,｜\s]\s?(?<team>(?<vrc>(?<num>[0-9]{2,5})[A-Z]?)|(?<vexu>[A-Z]{2,5}[0-9]?)|([nN][oO] [tT][eE][aA][mM]))/;
export const YOUTUBE_REGEX =
	/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|(?:embed|v)\/))([^?&"'>]+)/;

export type RegExpMatchArrayWithGroups<Keys extends string> = Omit<
	RegExpMatchArray,
	"groups"
> & { groups: Record<Keys, string>; 0: string };

export const hasGroupMatches = <T extends readonly string[]>(
	match: RegExpMatchArray | null,
	groups: T,
): match is RegExpMatchArrayWithGroups<T[number]> => {
	return (
		match !== null &&
		match.groups !== undefined &&
		groups.every((g) => g in (match.groups ?? {}))
	);
};
