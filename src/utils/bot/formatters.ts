import type { SubcommandMapping } from "@sapphire/plugin-subcommands";
import { snakeToCamelCase } from "@sapphire/utilities";
import {
	PermissionsBitField,
	type Snowflake,
	type TimestampStylesString,
	time,
} from "discord.js";
import { capitalize } from "../general/strings";

export const timestring = (ms: number, style: TimestampStylesString) => {
	return time(Math.round(ms / 1000), style);
};

export const chatInputMethod = (command: string) => {
	return `chatInput${capitalize(snakeToCamelCase(command))}`;
};

export const chatInputCommand = (command: string): SubcommandMapping => {
	return {
		name: command,
		chatInputRun: chatInputMethod(command),
	};
};

export const messageMethod = (command: string) => {
	return `message${capitalize(snakeToCamelCase(command))}`;
};

export const messageCommand = (command: string): SubcommandMapping => {
	return {
		name: command,
		messageRun: messageMethod(command),
	};
};

export const slashCommandMention = (
	command: string,
	subcommand: string | undefined,
	id: Snowflake,
) => {
	const formattedSubcommand = subcommand === undefined ? "" : ` ${subcommand}`;
	return `</${command}${formattedSubcommand}:${id}>`;
};

// Flags whose names differ from what Discord shows in its UI.
const PERMISSION_DISPLAY_NAMES: Record<string, string> = {
	ManageGuild: "Manage Server",
	ModerateMembers: "Timeout Members",
};

/**
 * Converts permission flags into the names shown in Discord, e.g.
 * "Manage Channels".
 */
export const formatPermissions = (permissions: bigint[]) => {
	if (permissions.length === 0) {
		return [];
	}
	return new PermissionsBitField(permissions)
		.toArray()
		.map(
			(name) =>
				PERMISSION_DISPLAY_NAMES[name] ??
				name.replace(/([a-z])([A-Z])/g, "$1 $2"),
		);
};
