import { type ILogger as ISapphireLogger, LogLevel } from "@sapphire/framework";
import pino, { type Logger, type LoggerExtras } from "pino";

export class PinoLoggerAdapter implements ISapphireLogger {
	private logger: Logger;

	constructor(logger?: Logger) {
		this.logger = logger ?? pino();
	}

	has(_level: LogLevel): boolean {
		return true;
	}

	trace(...values: readonly unknown[]): void {
		this.write(LogLevel.Trace, ...values);
	}

	debug(...values: readonly unknown[]): void {
		this.write(LogLevel.Debug, ...values);
	}

	info(...values: readonly unknown[]): void {
		this.write(LogLevel.Info, ...values);
	}

	warn(...values: readonly unknown[]): void {
		this.write(LogLevel.Warn, ...values);
	}

	error(...values: readonly unknown[]): void {
		this.write(LogLevel.Error, ...values);
	}

	fatal(...values: readonly unknown[]): void {
		this.write(LogLevel.Fatal, ...values);
	}

	write(level: LogLevel, ...values: readonly unknown[]): void {
		switch (level) {
			case LogLevel.Trace:
				this.logger.trace({ values });
				break;
			case LogLevel.Debug:
				this.logger.debug({ values });
				break;
			case LogLevel.Info:
				this.logger.info({ values });
				break;
			case LogLevel.Warn:
				this.logger.warn({ values });
				break;
			case LogLevel.Error:
				this.logger.error({ values });
				break;
			case LogLevel.Fatal:
				this.logger.fatal({ values });
				break;
			case LogLevel.None:
				break;
			default:
				((_: never) => {})(level);
				break;
		}
	}

	child(...args: Parameters<LoggerExtras["child"]>) {
		return this.logger.child(...args);
	}
}
