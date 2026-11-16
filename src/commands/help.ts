import { ApplyOptions } from "@sapphire/decorators";
import type { Command } from "@sapphire/framework";
import { cutText, isNullish } from "@sapphire/utilities";
import {
	type APIApplicationCommandBasicOption,
	type APIApplicationCommandOption,
	ApplicationCommandOptionType,
	bold,
	Colors,
	EmbedBuilder,
	inlineCode,
	MessageFlags,
} from "discord.js";
import { type CommandBundle, help } from "../interactions";
import { DOCUMENTED_COMMANDS } from "../interactions/help";
import {
	AugmentedCommand,
	CommandHints,
	chatCommandMention,
	formatPermissions,
} from "../utils/bot";

type AnyCommandBundle = CommandBundle<"Subcommand"> | CommandBundle<"Command">;

const FIELD_VALUE_LIMIT = 1024;
const MAX_FIELDS = 25;

@ApplyOptions<Command.Options>({
	name: help.commands.chat.base.name,
	description: help.commands.chat.base.description,
	preconditions: ["GuildOnly"],
})
export class HelpCommand extends AugmentedCommand {
	static readonly catalog: AnyCommandBundle[] = [...DOCUMENTED_COMMANDS, help];

	hints() {
		return new CommandHints({
			chat: {
				development: "1571704011436990666",
				production: "1571769441535000586",
			},
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(help.commands.chat.base);
	}

	public override async chatInputRun(
		inter: Command.ChatInputCommandInteraction,
	) {
		const target = inter.options.getString("command", false);
		const bundle = HelpCommand.catalog.find(
			(b) => b.commands.chat.base.name === target,
		);

		const embed = isNullish(bundle)
			? HelpCommand.buildOverview()
			: HelpCommand.buildDetails(bundle);

		await inter.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	}

	static buildOverview() {
		const helpMention = chatCommandMention(help.commands.chat.base.name);
		const embed = new EmbedBuilder()
			.setTitle("leek commands")
			.setColor(Colors.Green)
			.setDescription(
				[
					`Use ${helpMention} with the ${inlineCode("command")} option for detailed usage of a command.`,
					"Commands only appear for members with the required permissions. Server admins can change who can use each command in Server Settings → Integrations.",
				].join("\n\n"),
			);

		for (const bundle of HelpCommand.catalog.slice(0, MAX_FIELDS)) {
			const base = bundle.commands.chat.base.toJSON();
			const subcommands = HelpCommand.getSubcommands(base.options);
			const usage =
				subcommands.length === 0
					? chatCommandMention(base.name)
					: subcommands
							.map((sub) => chatCommandMention(base.name, sub.name))
							.join(" ");
			const contextMenus = Object.values(bundle.commands.message).map(
				(menu) => `${bold(menu.name)} (message context menu)`,
			);
			const permissions = HelpCommand.describePermissions(bundle);

			const value = [base.description, usage, ...contextMenus, permissions]
				.filter((line) => line !== "")
				.join("\n");
			embed.addFields({
				name: `/${base.name}`,
				value: cutText(value, FIELD_VALUE_LIMIT),
			});
		}

		return embed;
	}

	static buildDetails(bundle: AnyCommandBundle) {
		const base = bundle.commands.chat.base.toJSON();
		const permissions = HelpCommand.describePermissions(bundle);
		const embed = new EmbedBuilder()
			.setTitle(`/${base.name}`)
			.setColor(Colors.Green)
			.setDescription(
				[base.description, permissions].filter((l) => l !== "").join("\n\n"),
			);

		const subcommands = HelpCommand.getSubcommands(base.options);
		const fields: { name: string; value: string }[] = [];

		if (subcommands.length === 0) {
			fields.push({
				name: "Usage",
				value: HelpCommand.describeUsage(
					chatCommandMention(base.name),
					base.description,
					HelpCommand.getBasicOptions(base.options),
				),
			});
		} else {
			for (const sub of subcommands) {
				fields.push({
					name: sub.name,
					value: HelpCommand.describeUsage(
						chatCommandMention(base.name, sub.name),
						sub.description,
						HelpCommand.getBasicOptions(sub.options),
					),
				});
			}
		}

		for (const menu of Object.values(bundle.commands.message)) {
			fields.push({
				name: menu.name,
				value: `Message context menu. Right-click (or long-press) a message, then choose ${bold(`Apps → ${menu.name}`)}.`,
			});
		}

		embed.addFields(
			fields.slice(0, MAX_FIELDS).map((f) => ({
				name: f.name,
				value: cutText(f.value, FIELD_VALUE_LIMIT),
			})),
		);
		return embed;
	}

	static describeUsage(
		mention: string,
		description: string,
		options: APIApplicationCommandBasicOption[],
	) {
		const lines = [`${mention} — ${description}`];
		for (const option of options) {
			const required = option.required ? "required" : "optional";
			let line = `• ${inlineCode(option.name)} (${required}): ${option.description}`;
			if ("choices" in option && option.choices && option.choices.length > 0) {
				const choices = option.choices
					.map((c) => inlineCode(String(c.value)))
					.join(", ");
				const punctuation = /[.!?]$/.test(line) ? "" : ".";
				line += `${punctuation} One of ${choices}.`;
			}
			lines.push(line);
		}
		return lines.join("\n");
	}

	static describePermissions(bundle: AnyCommandBundle) {
		const names = formatPermissions(bundle.permissions);
		if (names.length === 0) {
			return "";
		}
		return `${bold("Requires:")} ${names.join(", ")}`;
	}

	static getSubcommands(options: APIApplicationCommandOption[] | undefined) {
		return (options ?? []).filter(
			(o) => o.type === ApplicationCommandOptionType.Subcommand,
		);
	}

	static getBasicOptions(options: APIApplicationCommandOption[] | undefined) {
		return (options ?? []).filter(
			(o): o is APIApplicationCommandBasicOption =>
				o.type !== ApplicationCommandOptionType.Subcommand &&
				o.type !== ApplicationCommandOptionType.SubcommandGroup,
		);
	}
}
