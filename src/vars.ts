const ENV_VARIABLES = [
	"DISCORD_TOKEN",
	"NODE_ENV",
	"LOKI_HOST",
	"LOKI_USERNAME",
	"LOKI_PASSWORD",
	"DB_HOST",
	"DB_PORT",
	"DB_USER",
	"DB_PASSWORD",
	"DB_NAME",
	"ROBOTEVENTS_TOKEN",
] as const;

type ConfigVariable = (typeof ENV_VARIABLES)[number];

const loadVars = () => {
	const loaded: Record<string, string> = {};
	ENV_VARIABLES.forEach((v) => {
		const value = process.env[v];
		if (value === undefined) {
			throw Error(`Environment variable '${v}' missing, exiting.`);
		}
		loaded[v] = value;
	});
	return loaded;
};

let CONFIG: Record<string, string> | null = null;

export const getvar = (key: ConfigVariable) => {
	CONFIG ??= loadVars();
	return CONFIG[key];
};
