import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import { ChannelType, type MessageReaction, type User } from "discord.js";
import { eq } from "drizzle-orm";
import { nameChangeRequestSettings } from "../db/schema";
import name_change_request from "../interactions/name_change_request";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";
import { NameChangeRequestListener } from "./name_change_request";

@ApplyOptions<Listener.Options>({
	event: Events.MessageReactionAdd,
})
export class NameChangeRequestApproveListener extends AugmentedListener<
	typeof Events.MessageReactionAdd
> {
	async run(reaction: MessageReaction, user: User) {
		const logger = this.getEventLogger(reaction.message.guildId);

		if (user.bot) {
			logger.debug({ user: user.id }, "User is a bot, exiting.");
			return;
		}

		if (reaction.partial) {
			logger.debug("Reaction is partial, fetching latest");
			const [, error] = await trycatch(() => reaction.fetch());
			if (error) {
				logger.error({ error }, "Unable to fetch partial reaction, exiting.");
			}
		}
		const message = reaction.message.partial
			? await reaction.message.fetch()
			: reaction.message;
		if (
			![ChannelType.PublicThread, ChannelType.GuildText].includes(
				message.channel.type,
			)
		) {
			logger.debug("Message not in text channel or public thread, exiting.");
			return;
		}

		if (!message.inGuild()) {
			logger.debug("Message not sent in guild, exiting.");
			return;
		}

		const [settings, error] = await trycatch(() =>
			this.db.query.nameChangeRequestSettings.findFirst({
				where: eq(nameChangeRequestSettings.gid, message.guildId),
			}),
		);

		if (error) {
			logger.error({ error }, "Unable to get name change request settings.");
			return;
		}

		if (message.channelId !== settings?.channel) {
			logger.debug("Reaction not in name change requests channel, exiting.");
			return;
		}

		const [targetMember, targetMemberError] = await trycatch(async () => {
			if (message.channel.isThread()) {
				logger.info("Getting target member from thread.");
				return message.guild?.members.fetch(message.author.id);
			}
			return message.member?.partial
				? await message.member.fetch(true)
				: message.member;
		});
		if (targetMemberError) {
			logger.error(
				{ error: targetMemberError },
				"Unable to resolve target member, exiting",
			);
			return;
		}
		if (isNullish(targetMember)) {
			logger.warn("Unable to resolve target member, exiting");
			return;
		}

		const [initiator, initiatorError] = await trycatch(() =>
			message.guild.members.fetch(user.id),
		);
		if (initiatorError) {
			logger.error(
				{ error: initiatorError },
				"Unable to resolve reacting member, exiting.",
			);
			return;
		}

		if (!initiator.permissions.has(name_change_request.permissions)) {
			logger.info(
				{
					missing: initiator.permissions.missing(
						name_change_request.permissions,
					),
				},
				"Reacting member does not have permissions, exiting.",
			);
			return;
		}

		if (reaction.emoji.name === NameChangeRequestListener.ApproveEmoji) {
			logger.info(
				`Attempting to approve name change request for ${targetMember.displayName}.`,
			);
			const [, error] = await trycatch(async () => {
				await targetMember.edit({ nick: message.content });
				await trycatch(async () =>
					message.reactions.cache
						.get(NameChangeRequestListener.RejectEmoji)
						?.remove(),
				);
			});
			if (error) {
				logger.error({ error }, "Unable to approve name change request.");
				return;
			}
			logger.info("Successfully approved name change request.");
		} else if (reaction.emoji.name === NameChangeRequestListener.RejectEmoji) {
			logger.info("Attempting to reject name change request.");
			const [, error] = await trycatch(async () =>
				message.reactions.cache
					.get(NameChangeRequestListener.ApproveEmoji)
					?.remove(),
			);
			if (error) {
				logger.error({ error }, "Unable to reject name change request.");
				return;
			}
			logger.info("Successfully rejected name change request.");
		} else {
			logger.info("Ignoring unrecognized reaction for name change request.");
		}
	}
}
