import { randomUUID } from "node:crypto";
import type { Command, ILogger } from "@sapphire/framework";
import type { Subcommand } from "@sapphire/plugin-subcommands";
import type { ContextMenuCommandInteraction } from "discord.js";
import type { Logger } from "pino";
import type { PinoLoggerAdapter } from "./pino_logger_adapter";

export class CommandLogger {
	private logger: Logger<string>;

	constructor(
		logger: ILogger,
		interaction:
			| Subcommand.ChatInputCommandInteraction
			| Command.ChatInputCommandInteraction
			| ContextMenuCommandInteraction,
	) {
		this.logger = (logger as PinoLoggerAdapter).child({
			guild: interaction.guildId,
			interaction: interaction.commandName,
			hash: randomUUID(),
		});
	}

	public async info(content: string, extras?: object) {
		this.logger.info({ ...extras }, content);
	}

	public async warn(content: string, extras?: object) {
		this.logger.warn({ ...extras }, content);
	}

	public async error(content: string, error: unknown) {
		this.logger.error({ err: error }, content);
	}
}
