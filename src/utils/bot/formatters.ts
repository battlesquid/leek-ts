import type { SubcommandMapping } from "@sapphire/plugin-subcommands";
import { snakeToCamelCase } from "@sapphire/utilities";
import { type Snowflake, type TimestampStylesString, time } from "discord.js";
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
