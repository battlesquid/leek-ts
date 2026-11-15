import {
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { combinePermissions } from "../utils/bot/bitwise";
import type { CommandBundle } from ".";
import hall_of_fame from "./hall_of_fame";
import imageboard from "./imageboard";
import logs from "./logs";
import name_change_request from "./name_change_request";
import reactroles from "./reactroles";
import timeout from "./timeout";
import verify from "./verify";

/**
 * Commands that the settings command can report on, in display order.
 */
export const SETTINGS_COMMANDS = [
	hall_of_fame,
	imageboard,
	logs,
	name_change_request,
	reactroles,
	timeout,
	verify,
].map((bundle) => bundle.commands.chat.base.name);

const permissions = [PermissionFlagsBits.ManageGuild];

const settings = new SlashCommandBuilder()
	.setName("settings")
	.setDescription("View this server's current settings for each command")
	.setDefaultMemberPermissions(combinePermissions(permissions))
	.setContexts(InteractionContextType.Guild)
	.addStringOption((option) =>
		option
			.setName("command")
			.setDescription("Only show settings for this command")
			.addChoices(SETTINGS_COMMANDS.map((name) => ({ name, value: name })))
			.setRequired(false),
	);

export default {
	permissions,
	commands: {
		chat: {
			base: settings,
			subcommands: undefined,
		},
		message: {},
	},
} satisfies CommandBundle<"Command">;
