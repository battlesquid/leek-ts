import { container } from "@sapphire/framework";
import { ApplicationCommandType, inlineCode, type Snowflake } from "discord.js";
import { AugmentedCommand, AugmentedSubcommand } from "./augments";
import { slashCommandMention } from "./formatters";

/**
 * Resolves the ID of a registered chat input command. Prefers the IDs Discord
 * returned at registration (which match the environment the bot is running
 * in), falling back to the hardcoded hints on the command piece.
 */
export const resolveChatCommandId = (name: string): Snowflake | undefined => {
	const registered = container.client.application?.commands.cache.find(
		(c) => c.name === name && c.type === ApplicationCommandType.ChatInput,
	);
	if (registered) {
		return registered.id;
	}

	const piece = container.stores.get("commands").get(name);
	if (
		piece instanceof AugmentedSubcommand ||
		piece instanceof AugmentedCommand
	) {
		const id = piece.hints().getChatId();
		if (id !== "") {
			return id;
		}
	}
	return undefined;
};

/**
 * Formats a clickable mention for a chat input command, or plain inline code
 * if the command's ID can't be resolved.
 */
export const chatCommandMention = (name: string, subcommand?: string) => {
	const id = resolveChatCommandId(name);
	if (id === undefined) {
		return inlineCode(
			subcommand === undefined ? `/${name}` : `/${name} ${subcommand}`,
		);
	}
	return slashCommandMention(name, subcommand, id);
};
