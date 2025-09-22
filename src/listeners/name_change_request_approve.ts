import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { ChannelType, MessageReaction, User, userMention } from "discord.js";
import { eq } from "drizzle-orm";
import { nameChangeRequestSettings } from "../db/schema";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";
import name_change_request from "../interactions/name_change_request";
import { isNullish } from "@sapphire/utilities";

@ApplyOptions<Listener.Options>({
    event: Events.MessageReactionAdd,
})
export class NameChangeRequestApproveListener extends AugmentedListener<"messageReactionAdd"> {
    async run(reaction: MessageReaction, user: User) {
        const logger = this.getEventLogger("NameChangeRequestApprove", reaction.message.guildId ?? "");

        if (user.bot) {
            return;
        }

        if (reaction.partial) {
            logger.info("Reaction is partial, fetching latest");
            const [, error] = await trycatch(() => reaction.fetch());
            if (error) {
                logger.error({ error }, "Unable to fetch partial reaction, exiting.");
            }
        }
        const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
        if (![ChannelType.PublicThread, ChannelType.GuildText].includes(message.channel.type)) {
            logger.info("Message not in text channel or public thread, exiting.");
            return;
        }

        const [targetMember, targetMemberError] = await trycatch(async () => {
            if (message.channel.isThread()) {
                return message.channel.guildMembers.get(message.author.id)
            }
            return message.member?.partial ? await message.member.fetch(true) : message.member
        });
        if (isNullish(targetMember)) {
            logger.info("Unable to resolve target member, exiting");
            if (targetMemberError) {
                logger.error({ error: targetMemberError }, "Unable to resolve target member, exiting");
            }
            return;
        }

        const [initiator, initiatorError] = await trycatch(() => message.guild!.members.fetch(user.id));
        if (initiatorError) {
            logger.error({ error: initiatorError })
            return;
        }

        if (!initiator.permissions.has(name_change_request.permissions)) {
            logger.info("Reacting member does not have permissions, exiting.");
            return;
        }

        const [settings, error] = await trycatch(() =>
            this.db.query.nameChangeRequestSettings.findFirst({
                where: eq(nameChangeRequestSettings.gid, message.guildId!)
            })
        );

        const canProcessRequest = error === null && message.channelId === settings?.channel;
        if (!canProcessRequest) {
            logger.info("Unable to process event");
            if (error) {
                logger.error({ error });
            }
            return;
        }

        logger.info("Processing event.");

        if (reaction.emoji.name === "✅") {
            logger.info(`Attempting to approve name change request for ${targetMember.displayName}.`);
            const [, error] = await trycatch(async () => {
                await targetMember.edit({ nick: message.content });
                await trycatch(() => message.reactions.cache.get("❌")!.remove());
            });
            if (error) {
                logger.error({ error }, "Unable to approve name change request.");
                return;
            }
            logger.info("Successfully approved name change request.");
        } else if (reaction.emoji.name === "❌") {
            logger.info("Attempting to reject name change request.");
            const [, error] = await trycatch(() => message.reactions.cache.get("✅")!.remove());
            if (error) {
                logger.error({ error }, "Unable to reject name change request.");
                return;
            }
            logger.info("Successfully rejected name change request.");
        }
    }
}
