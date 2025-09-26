import {
	ChannelType,
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { combinePermissions } from "../utils/bot/bitwise";
import type { CommandBundle } from ".";

const enable = new SlashCommandSubcommandBuilder()
	.setName("enable")
	.setDescription("Enable a type of log")
	.addStringOption((opt) =>
		opt
			.setName("type")
			.setDescription("The type of log to enable")
			.addChoices(
				{ name: "message", value: "message" },
				{ name: "image", value: "image" },
				{ name: "moderation", value: "moderation" },
			)
			.setRequired(true),
	)
	.addChannelOption((opt) =>
		opt
			.setName("channel")
			.setDescription("The channel to send these logs to")
			.addChannelTypes(ChannelType.GuildText)
			.setRequired(true),
	);

const disable = new SlashCommandSubcommandBuilder()
	.setName("disable")
	.setDescription("Disable a type of log")
	.addStringOption((opt) =>
		opt
			.setName("type")
			.setDescription("The type of log to disable")
			.addChoices(
				{ name: "message", value: "message" },
				{ name: "image", value: "image" },
				{ name: "moderation", value: "moderation" },
			)
			.setRequired(true),
	);

const permissions = [
	PermissionFlagsBits.ManageChannels,
	PermissionFlagsBits.ModerateMembers,
];

const logs = new SlashCommandBuilder()
	.setName("logs")
	.setDescription("Manage server wide logging")
	.setDefaultMemberPermissions(combinePermissions(permissions))
	.setContexts(InteractionContextType.Guild)
	.addSubcommand(enable)
	.addSubcommand(disable);

export default {
	permissions,
	commands: {
		chat: {
			base: logs,
			subcommands: {
				enable,
				disable,
			},
		},
		message: {},
	},
} satisfies CommandBundle<"Subcommand">;
