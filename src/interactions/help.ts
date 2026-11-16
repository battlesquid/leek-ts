import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import type { CommandBundle } from ".";
import about from "./about";
import hall_of_fame from "./hall_of_fame";
import imageboard from "./imageboard";
import logs from "./logs";
import name_change_request from "./name_change_request";
import reactroles from "./reactroles";
import settings from "./settings";
import timeout from "./timeout";
import verify from "./verify";

const HELP_COMMAND_NAME = "help";

/**
 * Every command documented by the help command (other than help itself), in
 * display order.
 */
export const DOCUMENTED_COMMANDS: (
	| CommandBundle<"Subcommand">
	| CommandBundle<"Command">
)[] = [
	hall_of_fame,
	imageboard,
	logs,
	name_change_request,
	reactroles,
	timeout,
	verify,
	settings,
	about,
];

const help = new SlashCommandBuilder()
	.setName(HELP_COMMAND_NAME)
	.setDescription("Show documentation for leek's commands")
	.setContexts(InteractionContextType.Guild)
	.addStringOption((option) =>
		option
			.setName("command")
			.setDescription("Show detailed documentation for a single command")
			.addChoices(
				[
					...DOCUMENTED_COMMANDS.map((b) => b.commands.chat.base.name),
					HELP_COMMAND_NAME,
				].map((name) => ({ name, value: name })),
			)
			.setRequired(false),
	);

export default {
	permissions: [],
	commands: {
		chat: {
			base: help,
			subcommands: undefined,
		},
		message: {},
	},
} satisfies CommandBundle<"Command">;
