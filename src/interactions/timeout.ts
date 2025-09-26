import {
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js";
import { combinePermissions } from "../utils/bot/bitwise";
import type { CommandBundle } from ".";

const permissions = [PermissionFlagsBits.ModerateMembers];

const timeout = new SlashCommandBuilder()
	.setName("timeout")
	.setDescription("Timeout a user")
	.setDefaultMemberPermissions(combinePermissions(permissions))
	.setContexts(InteractionContextType.Guild)
	.addUserOption((option) =>
		option
			.setName("user")
			.setDescription("The user to timeout")
			.setRequired(true),
	)
	.addStringOption((option) =>
		option
			.setName("duration")
			.setDescription("How long this user should be timed out for")
			.setRequired(true),
	)
	.addStringOption((option) =>
		option
			.setName("reason")
			.setDescription("The reason for timing this user out"),
	);

export default {
	permissions,
	commands: {
		chat: {
			base: timeout,
			subcommands: undefined,
		},
		message: {},
	},
} satisfies CommandBundle<"Command">;
