import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { MessageReaction, User } from "discord.js";
import { eq } from "drizzle-orm";
import { nameChangeRequestSettings } from "../db/schema";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";
import name_change_request from "../interactions/name_change_request";

@ApplyOptions<Listener.Options>({
    event: Events.MessageReactionAdd
})
export class NameChangeRequestApproveListener extends AugmentedListener<"messageReactionAdd"> {
    async run(reaction: MessageReaction, user: User) {
        const logger = this.getEventLogger("NameChangeRequestApprove", reaction.message.guildId ?? "");

        if (user.bot) {
            return;
        }

        const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
        if (!message.guild || !message.member) {
            logger.info("Unable to resolve guild/member, exiting.");
            return;
        }

        const [reactionMember, reactionMemberError] = await trycatch(() => message.guild!.members.fetch(user.id));
        if (reactionMemberError) {
            logger.error({ error: reactionMemberError })
            return;
        }

        if (!reactionMember.permissions.has(name_change_request.permissions)) {
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
            logger.info("Attempting to approve name change request.");
            const [, error] = await trycatch(async () => {
                await message.member!.setNickname(message.content);
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
