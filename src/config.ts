import * as path from "node:path";
import { config as configenv } from "dotenv";

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
] as const;

type ConfigVariable = (typeof ENV_VARIABLES)[number];

const loadConfig = () => {
	const { error } = configenv({ path: path.resolve(__dirname, "../.env") });
	if (error) {
		console.error(error);
		throw Error("Environment variables could not be loaded, exiting");
	}
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

export const getenv = (key: ConfigVariable) => {
	if (CONFIG === null) {
		CONFIG = loadConfig();
	}
	return CONFIG[key];
};
