import { ApplyOptions } from "@sapphire/decorators";
import { EmojiRegex } from "@sapphire/discord.js-utilities";
import type { Subcommand } from "@sapphire/plugin-subcommands";
import {
	type ChannelType,
	type ColorResolvable,
	type Embed,
	EmbedBuilder,
	type Message,
	roleMention,
	type TextChannel,
} from "discord.js";
import emojiRegex from "emoji-regex";
import { reactroles } from "../interactions";
import {
	AugmentedSubcommand,
	CommandHints,
	chatInputCommand,
} from "../utils/bot";
import { trycatch } from "../utils/general";

@ApplyOptions<Subcommand.Options>({
	name: reactroles.commands.chat.base.name,
	subcommands: [
		chatInputCommand(reactroles.commands.chat.subcommands.create.name),
		chatInputCommand(reactroles.commands.chat.subcommands.edit.name),
		chatInputCommand(reactroles.commands.chat.subcommands.add_role.name),
		chatInputCommand(reactroles.commands.chat.subcommands.remove_role.name),
	],
	preconditions: ["GuildTextOnly"],
	requiredUserPermissions: reactroles.permissions,
	requiredClientPermissions: [
		"SendMessages",
		"ReadMessageHistory",
		"AddReactions",
	],
})
export class ReactRolesCommand extends AugmentedSubcommand {
	hints() {
		return new CommandHints({
			chat: {
				development: "922949939909259264",
				production: "957187610416144386",
			},
		});
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		const hints = this.hints();
		registry.registerChatInputCommand(reactroles.commands.chat.base, {
			idHints: [hints.chat.development, hints.chat.production],
		});
	}

	private async findReactRole(
		channel: TextChannel,
		name: string,
	): Promise<[Message | undefined, Embed | undefined, size: number]> {
		const [messages, error] = await trycatch(() =>
			channel.messages.fetch({ limit: 100 }),
		);
		if (error !== null) {
			return [undefined, undefined, 0];
		}
		const msg = messages.find((m) => {
			if (!m.embeds.length) {
				return false;
			}
			const embed = m.embeds[0];
			if (embed.title !== name) {
				return false;
			}
			if (!ReactRolesCommand.isReactRole(embed)) {
				return false;
			}
			if (!this.container.client.user) {
				return false;
			}
			if (!m.author.equals(this.container.client.user)) {
				return false;
			}
			return true;
		});
		return [msg, msg?.embeds[0], messages.size];
	}

	public static isReactRole(embed: Embed) {
		return embed.footer?.text.match("reactroles") !== null;
	}

	public async chatInputCreate(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);

		const channel = inter.options.getChannel<ChannelType.GuildText>(
			"channel",
			true,
		);
		const title = inter.options.getString("title", true);
		const desc = inter.options.getString("description", false);
		const color =
			`#${inter.options.getString("color", false) ?? "444444"}` as ColorResolvable;
		const msg = inter.options.getString("message", false) ?? undefined;

		if (!/^#[A-Fa-f0-9]{6}$/.test(color.toString())) {
			inter.reply(`Invalid color '${color}' provided, exiting`);
			return;
		}

		try {
			await channel.send({
				content: msg,
				embeds: [
					new EmbedBuilder()
						.setTitle(title)
						.setDescription(desc)
						.setColor(color)
						.setFooter({ text: "reactroles" }),
				],
			});
			inter.reply(`New react roles created in ${channel}.`);
		} catch (error) {
			inter.reply({
				content: `An error occurred while creating '${title}'.`,
				ephemeral: true,
			});
			logger.error({ error }, `An error occurred while creating '${title}'.`);
		}
	}

	public async chatInputEdit(inter: Subcommand.ChatInputCommandInteraction) {
		const logger = this.logger(inter);

		const channel = inter.options.getChannel<ChannelType.GuildText>(
			"channel",
			true,
		);
		const title = inter.options.getString("title", true);
		const newTitle = inter.options.getString("new_title", false);
		const desc = inter.options.getString("description", false);
		const color: ColorResolvable = `#${inter.options.getString("color", false) ?? ""}`;
		const message = inter.options.getString("message", false) ?? undefined;

		const [reactroleMsg, reactrole, size] = await this.findReactRole(
			channel,
			title,
		);
		if (size === 0) {
			inter.reply(`Unable to read message history for ${channel}.`);
			return;
		}
		if (reactrole === undefined || reactroleMsg === undefined) {
			inter.reply(
				"The requested react-roles are either too far back or does not exist.",
			);
			return;
		}

		const editedReactrole = EmbedBuilder.from(reactrole);
		if (/^#[A-Fa-f0-9]{6}$/.test(color.toString())) {
			editedReactrole.setColor(color);
		}
		if (desc !== null) {
			editedReactrole.setDescription(desc);
		}
		if (newTitle !== null) {
			editedReactrole.setTitle(newTitle);
		}

		try {
			await reactroleMsg.edit({
				content: message,
				embeds: [editedReactrole],
			});
			inter.reply(`'${title}' updated successfully.`);
		} catch (error) {
			inter.reply({
				content: `An error occurred while editing '${title}'.`,
				ephemeral: true,
			});
			logger.error({ error }, `An error occurred while editing '${title}'.`);
		}
	}

	public async chatInputAddRole(inter: Subcommand.ChatInputCommandInteraction) {
		const logger = this.logger(inter);
		const channel = inter.options.getChannel<ChannelType.GuildText>(
			"channel",
			true,
		);
		const title = inter.options.getString("title", true);
		const role = inter.options.getRole("role", true);
		const emoji = inter.options.getString("emoji", true);

		if (!(emojiRegex().test(emoji) || EmojiRegex.test(emoji))) {
			inter.reply("Malformed emoji, exiting.");
			return;
		}
		const [msg, reactrole, size] = await this.findReactRole(channel, title);
		if (size === 0) {
			inter.reply(`Unable to read message history for ${channel}.`);
			return;
		}
		if (reactrole === undefined || msg === undefined) {
			inter.reply(
				"The requested react-roles are either too far back or does not exist.",
			);
			return;
		}

		if (reactrole.fields.find((f) => f.name === emoji)) {
			inter.reply("Emoji already in use, exiting.");
			return;
		}

		if (reactrole.fields.find((f) => f.value === roleMention(role.id))) {
			inter.reply("Role already included, exiting.");
			return;
		}

		const builder = EmbedBuilder.from(reactrole);
		builder.addFields([
			{ name: emoji, value: roleMention(role.id), inline: true },
		]);

		try {
			await msg.edit({ embeds: [builder] });
			await msg.react(emoji);
			inter.reply(
				`Users can now react to '${title}' with ${emoji} to get the ${role} role`,
			);
		} catch (error) {
			inter.reply({
				content: `An error occurred while editing '${title}'.`,
				ephemeral: true,
			});
			logger.error({ error }, `An error occurred while editing '${title}'.`);
		}
	}

	public async chatInputRemoveRole(
		inter: Subcommand.ChatInputCommandInteraction,
	) {
		const logger = this.logger(inter);
		const channel = inter.options.getChannel<ChannelType.GuildText>(
			"channel",
			true,
		);
		const title = inter.options.getString("title", true);
		const role = inter.options.getRole("role", true);

		const [msg, reactrole, size] = await this.findReactRole(channel, title);
		if (size === 0) {
			inter.reply(`Unable to read message history for ${channel}.`);
			return;
		}
		if (reactrole === undefined || msg === undefined) {
			inter.reply(
				"The requested react-roles are either too far back or does not exist.",
			);
			return;
		}

		const roleField = reactrole.fields.find(
			(f) => f.value === roleMention(role.id),
		);
		if (!roleField) {
			inter.reply(`${role} does not exist on '${title}'.`);
			return;
		}

		const fields = reactrole.fields.filter(
			(f) => f.value !== roleMention(role.id),
		);
		const builder = EmbedBuilder.from(reactrole);
		builder.setFields(fields);
		try {
			await msg.edit({ embeds: [builder] });
		} catch (error) {
			inter.reply({
				content: `An error occurred while removing ${role} from '${title}'.`,
				ephemeral: true,
			});
			logger.error(
				{ error },
				`An error occurred while removing ${role.name} from '${title}'.`,
			);
			return;
		}

		const match = roleField.name.match(EmojiRegex);
		const emoji =
			match !== null && match.groups !== undefined
				? match.groups.id
				: roleField.name;
		try {
			await msg.reactions.cache.get(emoji)?.remove();
			inter.reply(`Removed ${role} from '${title}'.`);
		} catch (error) {
			inter.reply({
				content: `An error occurred while removing ${role} from '${title}'.`,
				ephemeral: true,
			});
			logger.error(
				{ error },
				`An error occurred while removing ${role.name} from '${title}'.`,
			);
			return;
		}
	}
}
