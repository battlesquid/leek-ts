import os from "node:os";
import pino, { type LoggerOptions } from "pino";
import { getvar } from "./vars";

export const getLoggerInstance = (service: string, options?: LoggerOptions) => {
	return pino({
		...options,
		errorKey: "error",
		base: {
			env: getvar("NODE_ENV"),
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
						host: getvar("LOKI_HOST"),
						basicAuth: {
							username: getvar("LOKI_USERNAME"),
							password: getvar("LOKI_PASSWORD"),
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
