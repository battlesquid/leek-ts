import { ApplyOptions } from "@sapphire/decorators";
import type { Command } from "@sapphire/framework";
import { cutText, isNullish } from "@sapphire/utilities";
import {
	bold,
	Colors,
	channelMention,
	EmbedBuilder,
	MessageFlags,
	roleMention,
	type Snowflake,
} from "discord.js";
import { eq } from "drizzle-orm";
import {
	hallOfFameSettings,
	imageboard as imageboardSettings,
	logSettings,
	nameChangeRequestSettings,
	verifyEntry,
	verifySettings,
} from "../db/schema";
import {
	hall_of_fame,
	help,
	imageboard,
	logs,
	name_change_request,
	reactroles,
	settings,
	timeout,
	verify,
} from "../interactions";
import { SETTINGS_COMMANDS } from "../interactions/settings";
import {
	AugmentedCommand,
	CommandHints,
	chatCommandMention,
} from "../utils/bot";
import { trycatch } from "../utils/general";

type SettingsRenderer = (guildId: Snowflake) => Promise<string>;

const FIELD_VALUE_LIMIT = 1024;
const NOT_SET = "Not set";

const line = (label: string, value: string) => `${bold(label)}: ${value}`;

const list = (ids: string[], format: (id: string) => string) => {
	if (ids.length === 0) {
		return "None";
	}
	return ids.map(format).join(", ");
};

const channelOrNotSet = (id: string | null | undefined) =>
	isNullish(id) ? NOT_SET : channelMention(id);

@ApplyOptions<Command.Options>({
	name: settings.commands.chat.base.name,
	description: settings.commands.chat.base.description,
	preconditions: ["GuildOnly"],
	requiredUserPermissions: settings.permissions,
})
export class SettingsCommand extends AugmentedCommand {
	hints() {
		return new CommandHints({
			chat: {
				development: "1571704095247573105",
				production: "",
			},
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(settings.commands.chat.base);
	}

	private readonly renderers: Record<string, SettingsRenderer> = {
		[hall_of_fame.commands.chat.base.name]: async (gid) => {
			const result = await this.db.query.hallOfFameSettings.findFirst({
				where: eq(hallOfFameSettings.gid, gid),
			});
			const halls = result?.halls ?? [];
			const name = hall_of_fame.commands.chat.base.name;
			return [
				line("Halls", list(halls, channelMention)),
				halls.length === 0
					? `Add one with ${chatCommandMention(name, hall_of_fame.commands.chat.subcommands.enable.name)}.`
					: "",
			].join("\n");
		},

		[imageboard.commands.chat.base.name]: async (gid) => {
			const result = await this.db.query.imageboard.findFirst({
				where: eq(imageboardSettings.gid, gid),
			});
			const name = imageboard.commands.chat.base.name;
			return [
				line("Imageboard channels", list(result?.boards ?? [], channelMention)),
				line("Whitelisted roles", list(result?.whitelist ?? [], roleMention)),
				isNullish(result) || result.boards.length === 0
					? `Add one with ${chatCommandMention(name, imageboard.commands.chat.subcommands.enable.name)}.`
					: "",
			].join("\n");
		},

		[logs.commands.chat.base.name]: async (gid) => {
			const result = await this.db.query.logSettings.findFirst({
				where: eq(logSettings.gid, gid),
			});
			const name = logs.commands.chat.base.name;
			return [
				line("Message logs", channelOrNotSet(result?.message)),
				line("Image logs", channelOrNotSet(result?.image)),
				line("Moderation logs", channelOrNotSet(result?.moderation)),
				`Change with ${chatCommandMention(name, logs.commands.chat.subcommands.enable.name)} and ${chatCommandMention(name, logs.commands.chat.subcommands.disable.name)}.`,
			].join("\n");
		},

		[name_change_request.commands.chat.base.name]: async (gid) => {
			const result = await this.db.query.nameChangeRequestSettings.findFirst({
				where: eq(nameChangeRequestSettings.gid, gid),
			});
			const name = name_change_request.commands.chat.base.name;
			return [
				line("Request channel", channelOrNotSet(result?.channel)),
				isNullish(result)
					? `Enable with ${chatCommandMention(name, name_change_request.commands.chat.subcommands.enable.name)}.`
					: "",
			].join("\n");
		},

		[reactroles.commands.chat.base.name]: async () => {
			const name = reactroles.commands.chat.base.name;
			return `No server-wide settings. Each reactrole group is stored on its own message; manage groups with ${chatCommandMention(name, reactroles.commands.chat.subcommands.edit.name)}.`;
		},

		[timeout.commands.chat.base.name]: async (gid) => {
			const result = await this.db.query.logSettings.findFirst({
				where: eq(logSettings.gid, gid),
			});
			if (isNullish(result?.moderation)) {
				return `No settings. Timeouts are not being logged; enable moderation logs with ${chatCommandMention(logs.commands.chat.base.name, logs.commands.chat.subcommands.enable.name)}.`;
			}
			return `No settings. Timeouts are logged to ${channelMention(result.moderation)}.`;
		},

		[verify.commands.chat.base.name]: async (gid) => {
			const result = await this.db.query.verifySettings.findFirst({
				where: eq(verifySettings.gid, gid),
			});
			const name = verify.commands.chat.base.name;
			if (isNullish(result)) {
				return [
					line("Status", "Disabled"),
					`Enable with ${chatCommandMention(name, verify.commands.chat.subcommands.enable.name)}.`,
				].join("\n");
			}
			const pending = await this.db.$count(
				verifyEntry,
				eq(verifyEntry.gid, gid),
			);
			return [
				line("Status", "Enabled"),
				line("Type", result.type),
				result.type === "message"
					? line("New user channel", channelOrNotSet(result.new_user_channel))
					: "",
				line("Roles given on approval", list(result.roles, roleMention)),
				line("Create greeting", result.create_greeting ? "Yes" : "No"),
				line("Pending requests", pending.toString()),
				`Change with ${chatCommandMention(name, verify.commands.chat.subcommands.edit.name)}.`,
			].join("\n");
		},
	};

	public override async chatInputRun(
		inter: Command.ChatInputCommandInteraction,
	) {
		if (!inter.inGuild()) {
			return;
		}
		const logger = this.logger(inter);
		await inter.deferReply({ flags: MessageFlags.Ephemeral });

		const target = inter.options.getString("command", false);
		const names = isNullish(target)
			? SETTINGS_COMMANDS
			: SETTINGS_COMMANDS.filter((n) => n === target);

		const fields = await Promise.all(
			names.map(async (name) => {
				const [value, error] = await trycatch(() =>
					this.renderers[name](inter.guildId),
				);
				if (error) {
					logger.error(
						{ error, command: name },
						"Unable to load settings for command.",
					);
				}
				const text = (value ?? "Unable to load settings, try again later.")
					.split("\n")
					.filter((l) => l !== "")
					.join("\n");
				return {
					name: `/${name}`,
					value: cutText(text, FIELD_VALUE_LIMIT),
				};
			}),
		);

		const embed = new EmbedBuilder()
			.setTitle(`Settings for ${inter.guild?.name ?? "this server"}`)
			.setColor(Colors.Green)
			.addFields(fields)
			.setFooter({
				text: `Use /${help.commands.chat.base.name} for documentation on each command.`,
			});

		await inter.editReply({ embeds: [embed] });
	}
}
