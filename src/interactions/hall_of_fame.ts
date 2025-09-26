import {
	ApplicationCommandType,
	ChannelType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	PermissionFlagsBits,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { combinePermissions } from "../utils/bot/bitwise";
import type { CommandBundle } from ".";

const enable = new SlashCommandSubcommandBuilder()
	.setName("enable")
	.setDescription("Enable hall of fame on a given channel")
	.addChannelOption((option) =>
		option
			.setName("channel")
			.setDescription("The channel to enable")
			.addChannelTypes(ChannelType.GuildText)
			.setRequired(true),
	);

const disable = new SlashCommandSubcommandBuilder()
	.setName("disable")
	.setDescription("Disable hall of fame on a given channel")
	.addChannelOption((option) =>
		option
			.setName("channel")
			.setDescription("The channel to disable")
			.addChannelTypes(ChannelType.GuildText)
			.setRequired(true),
	);

const permissions = [
	PermissionFlagsBits.ManageChannels,
	PermissionFlagsBits.ManageMessages,
];

const hallOfFame = new SlashCommandBuilder()
	.setName("hall_of_fame")
	.setDescription("For recording noteworthy server content")
	.setDefaultMemberPermissions(combinePermissions(permissions))
	.setContexts(InteractionContextType.Guild)
	.addSubcommand(enable)
	.addSubcommand(disable);

const promote = new ContextMenuCommandBuilder()
	.setName("Add to Hall of Fame")
	.setType(ApplicationCommandType.Message)
	.setDefaultMemberPermissions(combinePermissions(permissions))
	.setContexts(InteractionContextType.Guild);

export default {
	permissions,
	commands: {
		chat: {
			base: hallOfFame,
			subcommands: {
				enable,
				disable,
			},
		},
		message: {
			promote,
		},
	},
} satisfies CommandBundle<"Subcommand">;
