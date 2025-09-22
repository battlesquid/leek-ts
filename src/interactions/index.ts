import type {
	ContextMenuCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface CommandBundle<
	Type extends "Subcommand" | "Command" = "Command",
> {
	permissions: bigint[];
	commands: {
		chat: {
			base: Type extends "Subcommand"
				? SlashCommandSubcommandsOnlyBuilder
				: SlashCommandOptionsOnlyBuilder;
			subcommands: Type extends "Subcommand"
				? Record<string, SlashCommandSubcommandBuilder>
				: undefined;
		};
		message: Record<string, ContextMenuCommandBuilder>;
	};
}

export { default as hall_of_fame } from "./hall_of_fame";
export { default as imageboard } from "./imageboard";
export { default as logs } from "./logs";
export { default as reactroles } from "./reactroles";
export { default as timeout } from "./timeout";
export { default as verify } from "./verify";
