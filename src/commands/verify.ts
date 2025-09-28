import { ApplyOptions } from "@sapphire/decorators";
import type { Subcommand } from "@sapphire/plugin-subcommands";
import { isNullish } from "@sapphire/utilities";
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	bold,
	ChannelType,
	channelMention,
	EmbedBuilder,
	inlineCode,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	type Snowflake,
	type TextChannel,
	TextInputBuilder,
	TextInputStyle,
	userMention,
} from "discord.js";
import { eq } from "drizzle-orm";
import type pino from "pino";
import { arrayAppend, arrayRemove, arrayReplace } from "../db";
import {
	type VerifySettings,
	type VerifyUser,
	verifyEntry,
	verifySettings,
} from "../db/schema";
import { VerifyModalHandler } from "../interaction-handlers/verify_modal";
import { verify } from "../interactions";
import { VerificationType } from "../interactions/verify";
import { VerifyRequestListener } from "../listeners/verify_request";
import {
	AugmentedSubcommand,
	CommandHints,
	chatInputCommand,
	Emojis,
	hasGroupMatches,
	PaginatedEmbed,
	slashCommandMention,
	VERIFY_REGEX,
} from "../utils/bot";
import { plural, trycatch } from "../utils/general";

@ApplyOptions<Subcommand.Options>({
	name: verify.commands.chat.base.name,
	subcommands: [
		chatInputCommand(verify.commands.chat.subcommands.list.name),
		chatInputCommand(verify.commands.chat.subcommands.enable.name),
		chatInputCommand(verify.commands.chat.subcommands.disable.name),
		chatInputCommand(verify.commands.chat.subcommands.add_role.name),
		chatInputCommand(verify.commands.chat.subcommands.remove_role.name),
		chatInputCommand(verify.commands.chat.subcommands.edit.name),
		chatInputCommand(verify.commands.chat.subcommands.request.name),
		chatInputCommand(verify.commands.chat.subcommands.rescan.name),
	],
	preconditions: ["GuildTextOnly"],
	requiredUserPermissions: verify.permissions,
	requiredClientPermissions: [
		"SendMessages",
		"ManageNicknames",
		"UseExternalEmojis",
	],
})
export class VerifyCommand extends AugmentedSubcommand {
	hints() {
		return new CommandHints({
			chat: {
				development: "919820845126385737",
				production: "957187610416144389",
			},
		});
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		const hints = this.hints();
		registry.registerChatInputCommand(verify.commands.chat.base, {
			idHints: [hints.chat.development, hints.chat.production],
		});
	}

	public async chatInputEnable(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);
		const role = inter.options.getRole("role", true);
		const type = inter.options.getString("type", true);
		const channel = inter.options.getChannel("new_user_channel", false);
		const createGreeting =
			inter.options.getBoolean("create_greeting", false) ?? false;

		if (type === "message" && isNullish(channel)) {
			inter.reply(
				"You must specify a new users channel for message verification",
			);
			return;
		}

		if (role.managed) {
			inter.reply(
				`${role} is managed by an external service and cannot be used.`,
			);
			return;
		}

		const [settings, error] = await this.getSettings(inter.guildId);
		if (error) {
			inter.reply({
				content: "An error occurred while retrieving your settings.",
				ephemeral: true,
			});
			logger.error(
				{ error },
				"An error occurred while retrieving your settings.",
			);
			return;
		}
		if (settings) {
			const mention = slashCommandMention(
				this.name,
				verify.commands.chat.subcommands.edit.name,
				this.hints().getChatId(),
			);
			inter.reply(
				`Verification is already enabled. Edit your settings with ${mention}.`,
			);
			return;
		}

		const newUserChannel = type === "message" ? channel?.id : null;
		const command = this.getCommandMention(
			verify.commands.chat.subcommands.request.name,
			"chat",
		);
		const successText =
			type === "message"
				? ` Users can send their name in the format ${inlineCode("Name | Team")} in the channel ${channel} to submit a verification request.`
				: ` Users can use the command ${command} to submit a verification request.`;
		try {
			await this.db.insert(verifySettings).values([
				{
					gid: inter.guildId,
					type,
					new_user_channel: newUserChannel,
					roles: [role.id],
					create_greeting: createGreeting,
				},
			]);
			inter.reply(`Verification enabled.${successText}`);
		} catch (error) {
			inter.reply({
				content: "An error occurred while enabling verification.",
				ephemeral: true,
			});
			logger.error({ error }, "An error occurred while enabling verification.");
		}
	}

	public async chatInputDisable(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);

		const [settings, error] = await this.getSettings(inter.guildId);
		if (error) {
			inter.reply({
				content: "An error occurred while retrieving your settings.",
				ephemeral: true,
			});
			logger.error(
				{ error },
				"An error occurred while retrieving your settings.",
			);
			return;
		}
		if (isNullish(settings)) {
			inter.reply("Verification is already disabled.");
			return;
		}
		try {
			await this.db
				.delete(verifySettings)
				.where(eq(verifySettings.gid, inter.guildId));
			await this.db
				.delete(verifyEntry)
				.where(eq(verifyEntry.gid, inter.guildId));
			inter.reply("Verification disabled.");
		} catch (error) {
			inter.reply({
				content: "An error occurred while disabling verification.",
				ephemeral: true,
			});
			logger.error(
				{ error },
				"An error occurred while disabling verification.",
			);
		}
	}

	public async chatInputRequest(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);
		const [settings, error] = await this.getSettings(inter.guildId);
		if (error) {
			logger.error(
				{ error },
				"An error occurred while retrieving your settings.",
			);
			inter.reply({
				content:
					"An error occurred while processing your request, please try again later.",
				ephemeral: true,
			});
			return;
		}
		if (isNullish(settings)) {
			inter.reply({
				content: "This server does not have verification enabled.",
				ephemeral: true,
			});
			return;
		}

		if (settings.type !== "command") {
			inter.reply({
				content: `This server does not have command verification enabled. Send your request in ${channelMention(settings.new_user_channel as string)} in the format ${inlineCode("Name | Team")}.`,
				ephemeral: true,
			});
			return;
		}

		if (inter.member.roles.cache.hasAll(...settings.roles)) {
			inter.reply({
				content: "You are already verified!",
				ephemeral: true,
			});
			return;
		}

		const modal = new ModalBuilder()
			.setCustomId(VerifyModalHandler.MODAL_ID)
			.setTitle("Request Verification");
		const nameInput = new TextInputBuilder()
			.setCustomId(VerifyModalHandler.NAME_INPUT)
			.setLabel("Name")
			.setStyle(TextInputStyle.Short);
		const teamInput = new TextInputBuilder()
			.setCustomId(VerifyModalHandler.TEAM_INPUT)
			.setLabel("Team")
			.setStyle(TextInputStyle.Short);
		modal.addComponents(
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				nameInput,
			),
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				teamInput,
			),
		);

		await inter.showModal(modal);
	}

	public async chatInputList(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);
		const [settings, error] = await this.getSettings(inter.guildId);
		if (error) {
			inter.reply({
				content: "An error occurred while retrieving your settings.",
				ephemeral: true,
			});
			logger.error(
				{ error },
				"An error occurred while retrieving your settings.",
			);
			return;
		}
		if (isNullish(settings)) {
			const mention = slashCommandMention(
				this.name,
				verify.commands.chat.subcommands.enable.name,
				this.hints().getChatId(),
			);
			inter.reply(`Verification is not enabled. Enable it with ${mention}.`);
			return;
		}

		const users = await this.db.query.verifyEntry.findMany({
			where: eq(verifyEntry.gid, inter.guildId),
		});

		if (users.length === 0) {
			inter.reply("No pending verifications.");
			return;
		}

		const rescanMention = slashCommandMention(
			this.name,
			verify.commands.chat.subcommands.rescan.name,
			this.hints().getChatId(),
		);
		const template = new EmbedBuilder().setColor("Greyple");
		const SUBMIT_ID = "@leekbot/submit";
		new PaginatedEmbed({
			inter,
			title: "Verification List",
			useLargeTitle: true,
			items: users,
			itemsPerPage: 6,
			timeout: 10_000,
			template,
			prev: new ButtonBuilder()
				.setEmoji(Emojis.LeftArrow)
				.setStyle(ButtonStyle.Primary),
			next: new ButtonBuilder()
				.setEmoji(Emojis.RightArrow)
				.setStyle(ButtonStyle.Primary),
			actions: [
				new ButtonBuilder()
					.setCustomId(SUBMIT_ID)
					.setEmoji(Emojis.Checkmark)
					.setStyle(ButtonStyle.Success),
			],
			itemFormatter: (user, i) =>
				`${inlineCode(`${i + 1}. `)}  ${bold(user.nick)} •︎ ${userMention(user.uid)}`,
			footerFormatter: () =>
				`Users missing? Run ${rescanMention} to detect missed users.`,
			onCollect: async (collector, inter) => {
				if (inter.customId !== SUBMIT_ID) {
					return;
				}
				collector.stop();
				await this.onVerifySubmit(
					settings,
					users,
					inter as ButtonInteraction<"cached">,
				);
			},
		}).send();
	}

	public async chatInputAddRole(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);
		const role = inter.options.getRole("role", true);
		if (role.managed) {
			inter.reply(
				`${role} is managed by an external service and cannot be used.`,
			);
			return;
		}
		const [settings, error] = await this.getSettings(inter.guildId);
		if (error) {
			inter.reply({
				content: "An error occurred while retrieving your settings.",
				ephemeral: true,
			});
			logger.error(
				{ error },
				"An error occurred while retrieving your settings.",
			);
			return;
		}
		if (isNullish(settings)) {
			const mention = slashCommandMention(
				this.name,
				verify.commands.chat.subcommands.enable.name,
				this.hints().getChatId(),
			);
			inter.reply(`Verification is not enabled. Enable it with ${mention}.`);
			return;
		}

		const included = settings.roles.find((r) => r === role.id);
		if (included) {
			inter.reply(`${role} is already included in the list of roles.`);
			return;
		}

		try {
			await this.db
				.update(verifySettings)
				.set({ roles: arrayAppend(verifySettings.roles, role.id) })
				.where(eq(verifySettings.gid, inter.guildId));
			inter.reply(`Added ${role} to verification roles.`);
		} catch (error) {
			inter.reply({
				content: `An error occurred while trying to add ${role} to verification roles.`,
				ephemeral: true,
			});
			logger.error(
				{ error },
				`An error occurred while trying to add ${role.name} to verification roles.`,
			);
		}
	}
	public async chatInputRemoveRole(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);
		const role = inter.options.getRole("role", true);
		const replacementRole = inter.options.getRole("replacement_role", false);

		if (replacementRole?.managed) {
			inter.reply(
				`${replacementRole} is managed by an external service and cannot be used.`,
			);
			return;
		}

		const [settings, error] = await this.getSettings(inter.guildId);
		if (error) {
			inter.reply({
				content: "An error occurred while retrieving your settings.",
				ephemeral: true,
			});
			logger.error(
				{ error },
				"An error occurred while retrieving your settings.",
			);
			return;
		}
		if (isNullish(settings)) {
			const mention = slashCommandMention(
				this.name,
				verify.commands.chat.subcommands.enable.name,
				this.hints().getChatId(),
			);
			inter.reply(`Verification is not enabled. Enable it with ${mention}.`);
			return;
		}

		const included = settings.roles.find((r) => r === role.id);
		if (!included) {
			inter.reply(`${role} is already not included in the list of roles.`);
			return;
		}

		const doReplace = !isNullish(replacementRole);
		if (settings.roles.length === 1 && !doReplace) {
			const mention = slashCommandMention(
				this.name,
				verify.commands.chat.subcommands.add_role.name,
				this.hints().getChatId(),
			);
			inter.reply(
				`A minimum of one role is required. To remove this role, add another in its place using ${mention}, or use the this command's 'replacement_role' option.`,
			);
			return;
		}

		if (doReplace && settings.roles.includes(replacementRole.id)) {
			inter.reply(
				`${replacementRole} cannot be used as a replacement role because it is already included in the list of verification roles.`,
			);
			return;
		}

		let replaceText = "";
		if (doReplace) {
			replaceText = ` (replaced with ${replacementRole})`;
		}

		try {
			await this.db
				.update(verifySettings)
				.set({
					roles: doReplace
						? arrayReplace(verifySettings.roles, role.id, replacementRole.id)
						: arrayRemove(verifySettings.roles, role.id),
				})
				.where(eq(verifySettings.gid, inter.guildId));
			inter.reply(`Removed ${role} from verification roles${replaceText}.`);
		} catch (error) {
			inter.reply({
				content: `An error occurred while trying to remove ${role} to verification roles.`,
				ephemeral: true,
			});
			logger.error(
				{ error },
				`An error occurred while trying to remove ${role.name} to verification roles.`,
			);
		}
	}

	public async chatInputEdit(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const type = inter.options.getString("type", false);
		const channel = inter.options.getChannel("new_user_channel", false);
		const createGreeting = inter.options.getBoolean("create_greeting", false);
		if (isNullish(type) && isNullish(channel) && isNullish(createGreeting)) {
			inter.reply("No options specified, exiting.");
			return;
		}

		const logger = this.logger(inter);
		const [settings, error] = await this.getSettings(inter.guildId);
		if (error) {
			inter.reply({
				content: "An error occurred while retrieving your settings.",
				ephemeral: true,
			});
			logger.error(
				{ error },
				"An error occurred while retrieving your settings.",
			);
			return;
		}
		if (isNullish(settings)) {
			const mention = slashCommandMention(
				this.name,
				verify.commands.chat.subcommands.enable.name,
				this.hints().getChatId(),
			);
			inter.reply(`Verification is not enabled. Enable it with ${mention}.`);
			return;
		}

		if (isNullish(type) && !isNullish(channel)) {
			inter.reply(
				"You must specify the verification type as 'message' in order to set a new users channel",
			);
			return;
		}

		const resolvedType = type ?? settings.type;
		const resolvedChannel = isNullish(channel)
			? settings.new_user_channel
			: channel.id;
		const resolvedGreeting = createGreeting ?? settings.create_greeting;

		if (
			resolvedType === VerificationType.Message &&
			isNullish(resolvedChannel)
		) {
			inter.reply(
				"You must specify a new users channel for message verification",
			);
			return;
		}

		try {
			await this.db
				.update(verifySettings)
				.set({
					type: resolvedType,
					new_user_channel:
						resolvedType === VerificationType.Message ? resolvedChannel : null,
					create_greeting: resolvedGreeting,
				})
				.where(eq(verifySettings.gid, inter.guildId));
			inter.reply("Successfully updated verification settings.");
		} catch (error) {
			inter.reply({
				content: "An error occurred while editing your verification settings.",
				ephemeral: true,
			});
			logger.error(
				{ error },
				"An error occurred while editing your verification settings.",
			);
		}
	}

	public async chatInputRescan(
		inter: Subcommand.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);
		await inter.deferReply({ ephemeral: true });

		const before = inter.options.getString("start", false) ?? undefined;
		const [settings, settingsError] = await this.getSettings(inter.guildId);
		if (settingsError) {
			await inter.editReply("An error occurred while retrieving settings.");
			logger.error(
				{ error: settingsError },
				"An error occurred while retrieving settings.",
			);
			return;
		}
		if (isNullish(settings)) {
			const mention = slashCommandMention(
				this.name,
				verify.commands.chat.subcommands.enable.name,
				this.hints().getChatId(),
			);
			await inter.editReply(
				`Verification is not enabled. Enable it with ${mention}.`,
			);
			return;
		}
		if (settings.type !== "message") {
			await inter.editReply(
				"Rescanning is only supported for message verification.",
			);
			return;
		}

		if (isNullish(settings.new_user_channel)) {
			inter.reply(
				"Encountered inconsistent state...how did you get here...exiting.",
			);
			return;
		}

		const [channel, channelError] = await trycatch(() =>
			this.container.client.channels.fetch(settings.new_user_channel as string),
		);
		if (channelError) {
			inter.editReply("An error occurred, please try again later.");
		}
		if (channel === null || channelError !== null) {
			await inter.editReply(
				`${channelMention(settings.new_user_channel)} was not found, check that the channel exists, then try again`,
			);
			return;
		}

		if (channel.type !== ChannelType.GuildText) {
			const mention = slashCommandMention(
				this.name,
				verify.commands.chat.subcommands.edit.name,
				this.hints().getChatId(),
			);
			await inter.editReply(
				`Rescanning is only supported on text channels. Change your channel settings or update your new user channel with ${mention}, then try again`,
			);
			return;
		}

		const [users, userError] = await trycatch(() =>
			this.db.query.verifyEntry.findMany({
				where: eq(verifyEntry.gid, inter.guildId),
			}),
		);
		if (userError !== null) {
			await inter.editReply(
				"An error occurred while retreiving existing users, please try again later.",
			);
			return;
		}

		logger.info("Scanning for verification requests.");
		const [requests, requestsError] = await trycatch(() =>
			this.getUnverifiedUsers(channel, users, settings, logger, before),
		);

		if (requestsError) {
			logger.error({ error: requestsError });
			return;
		}

		logger.info(`${requests.length} new users found`);
		if (requests.length === 0) {
			await inter.editReply("Verification list is already up to date.");
			return;
		}

		logger.info(`Inserting ${requests.length} scanned users.`);
		const [, error] = await trycatch(() =>
			this.db.insert(verifyEntry).values(requests).onConflictDoNothing(),
		);
		if (error) {
			await inter.editReply(
				`An error occurred while rescanning ${channelMention(settings.new_user_channel)}, please try again later.`,
			);
			return;
		}

		await inter.editReply(
			`Rescan complete, verification list updated (${requests.length} ${plural("user", requests.length)}).`,
		);
	}

	private async getUnverifiedUsers(
		channel: TextChannel,
		users: VerifyUser[],
		settings: VerifySettings,
		logger: pino.Logger<string, boolean>,
		before: Snowflake | undefined = undefined,
	) {
		const history = await channel.messages.fetch({
			limit: 100,
			cache: false,
			before,
		});

		const uniqueHistory = history
			.filter(
				(message, key, coll) =>
					key === coll.find((m) => m.author.id === message.author.id)?.id,
			)
			.sort((msg1, msg2) => msg2.createdTimestamp - msg1.createdTimestamp);

		logger.debug(
			{ users: uniqueHistory.map((m) => m.author.displayName) },
			`Retrieved ${uniqueHistory.size} unique requests.`,
		);
		const members = await channel.guild.members.fetch({
			user: [...uniqueHistory.mapValues((message) => message.author).values()],
		});
		logger.debug("Resolved all members");

		const requests = [
			...uniqueHistory.map((message): VerifyUser | undefined => {
				logger.debug(
					{ content: message.content },
					`Now processing ${message.author.displayName}`,
				);
				const isUser = !message.author.bot;
				const noExistingEntry =
					users.find((e) => e.uid === message.author.id) === undefined;
				const match = message.content.match(VERIFY_REGEX);
				const valid =
					isUser &&
					match &&
					noExistingEntry &&
					hasGroupMatches(match, ["name", "team"] as const);

				logger.debug({
					isUser,
					noExistingEntry,
					content: message.content,
					match: !!match,
					valid,
				});

				if (!valid) {
					return undefined;
				}

				const member = members.get(message.author.id);
				if (member?.roles.cache.hasAll(...settings.roles)) {
					return undefined;
				}

				logger.debug(
					`${member?.displayName} does not have all roles, continuing.`,
				);
				const nick = VerifyRequestListener.formatNickname(
					match.groups.name,
					match.groups.team,
				);

				return {
					gid: message.guildId,
					uid: message.author.id,
					nick,
				};
			}),
		];
		const result = requests.filter((r) => r !== undefined);
		logger.info({ result }, "Finished processing unverified users");
		return result;
	}

	private async onVerifySubmit(
		settings: VerifySettings,
		users: VerifyUser[],
		inter: ButtonInteraction<"cached">,
	) {
		const reply = await inter.followUp(
			"Processing verification list, please wait.",
		);

		const handleUserVerify = async (user: VerifyUser) => {
			try {
				await inter.guild.members.edit(user.uid, {
					roles: settings.roles,
					nick: user.nick,
					reason: `Verified by ${inter.user.tag}`,
				});
				return user;
			} catch (_e) {
				return undefined;
			}
		};

		const promises = await Promise.all(users.map(handleUserVerify));
		const verified = promises.filter((u): u is VerifyUser => u !== undefined);
		const failedCount = users.length - verified.length;

		let response = `Verified ${verified.length} ${plural("user", verified.length)}.`;
		if (failedCount !== 0) {
			response += ` Failed to verify ${failedCount} ${plural("user", failedCount)}.`;
		}

		trycatch(() => {
			return this.db
				.delete(verifyEntry)
				.where(eq(verifyEntry.gid, inter.guildId));
		});
		await reply.edit(response);

		if (settings.create_greeting && verified.length > 0) {
			const mentions = verified.map((u) => userMention(u.uid)).join(", ");
			const channel = (await inter.guild.channels.fetch(
				inter.channelId,
			)) as TextChannel;
			trycatch(() => channel.send(inlineCode(`Welcome ${mentions}!`)));
		}
	}

	private async getSettings(guildId: string) {
		return await trycatch(() =>
			this.db.query.verifySettings.findFirst({
				where: eq(verifySettings.gid, guildId),
			}),
		);
	}
}
