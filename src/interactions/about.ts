import { InteractionContextType, SlashCommandBuilder } from "discord.js";
import type { CommandBundle } from ".";

const about = new SlashCommandBuilder()
	.setName("about")
	.setDescription("General information about leek, with links")
	.setContexts(InteractionContextType.Guild);

export default {
	permissions: [],
	commands: {
		chat: {
			base: about,
			subcommands: undefined,
		},
		message: {},
	},
} satisfies CommandBundle<"Command">;
