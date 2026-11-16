import { ApplyOptions } from "@sapphire/decorators";
import type { Command } from "@sapphire/framework";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	version as discordjsVersion,
	EmbedBuilder,
	hyperlink,
	MessageFlags,
	TimestampStyles,
} from "discord.js";
import { about, help, settings } from "../interactions";
import { LINKS } from "../links";
import {
	AugmentedCommand,
	CommandHints,
	chatCommandMention,
	timestring,
} from "../utils/bot";

@ApplyOptions<Command.Options>({
	name: about.commands.chat.base.name,
	description: about.commands.chat.base.description,
	preconditions: ["GuildOnly"],
})
export class AboutCommand extends AugmentedCommand {
	hints() {
		return new CommandHints({
			chat: {
				development: "1571704007578226749",
				production: "1571769356659200171",
			},
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand(about.commands.chat.base);
	}

	public override async chatInputRun(
		inter: Command.ChatInputCommandInteraction,
	) {
		const { client } = this.container;
		const helpMention = chatCommandMention(help.commands.chat.base.name);
		const settingsMention = chatCommandMention(
			settings.commands.chat.base.name,
		);
		const startedAt = Date.now() - (client.uptime ?? 0);

		const embed = new EmbedBuilder()
			.setTitle("About leek")
			.setColor(Colors.Green)
			.setThumbnail(client.user?.displayAvatarURL() ?? null)
			.setDescription(
				[
					"A (mostly) general purpose bot, primarily made to help out on VEX Robotics servers. Most features work in any server.",
					`Features include verification, reactroles, imageboards, logging, a hall of fame, and name change requests. Use ${helpMention} to see every command, and ${settingsMention} to see how this server is set up.`,
					`leek is open source. Found a bug or have an idea? ${hyperlink("Open an issue", LINKS.issues)}.`,
				].join("\n\n"),
			)
			.addFields(
				{
					name: "Servers",
					value: client.guilds.cache.size.toLocaleString("en-US"),
					inline: true,
				},
				{
					name: "Online since",
					value: timestring(startedAt, TimestampStyles.RelativeTime),
					inline: true,
				},
				{
					name: "Built with",
					value: `discord.js v${discordjsVersion}, Node.js ${process.version}`,
					inline: true,
				},
			);

		const links = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel("Invite")
				.setURL(LINKS.invite),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel("Source code")
				.setURL(LINKS.repository),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel("Privacy Policy")
				.setURL(LINKS.privacyPolicy),
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setLabel("Report an issue")
				.setURL(LINKS.issues),
		);

		await inter.reply({
			embeds: [embed],
			components: [links],
			flags: MessageFlags.Ephemeral,
		});
	}
}
