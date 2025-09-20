import os from "node:os";
import pino, { type LoggerOptions } from "pino";
import { getenv } from "./config";

export const getLoggerInstance = (service: string, options?: LoggerOptions) => {
	return pino({
		...options,
		errorKey: "error",
		base: {
			env: getenv("NODE_ENV"),
			pid: process.pid,
			hostname: os.hostname(),
		},
		transport: {
			targets: [
				{
					target: "pino-loki",
					options: {
						batching: true,
						interval: 5,
						labels: {
							service,
						},
						host: getenv("LOKI_HOST"),
						basicAuth: {
							username: getenv("LOKI_USERNAME"),
							password: getenv("LOKI_PASSWORD"),
						},
					},
				},
				{
					target: "pino/file",
					options: { destination: 1 },
				},
			],
		},
	});
};
