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
        if (user.bot) {
            return;
        }

        const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
        if (!message.guild || !message.member) {
            return;
        }

        const [reactionMember, reactionMemberError] = await trycatch(() => message.guild!.members.fetch(user.id));
        if (reactionMemberError) {
            return;
        }

        if (!reactionMember.permissions.has(name_change_request.permissions)) {
            return;
        }

        const [settings, error] = await trycatch(() =>
            this.db.query.nameChangeRequestSettings.findFirst({
                where: eq(nameChangeRequestSettings.gid, message.guildId!)
            })
        );

        const canProcessRequest = error === null && message.channelId === settings?.channel;
        if (!canProcessRequest) {
            return;
        }

        if (reaction.emoji.name === "✅") {
            await trycatch(async () => {
                await message.member!.setNickname(message.content);
                await trycatch(() => message.reactions.cache.get("❌")!.remove());
            });
        } else if (reaction.emoji.name === "❌") {
            await trycatch(() => message.reactions.cache.get("✅")!.remove());
        }
    }
}
