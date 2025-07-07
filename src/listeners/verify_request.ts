import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { Message, MessageMentions, Snowflake, inlineCode } from "discord.js";
import { eq } from "drizzle-orm";
import { verifyEntry, verifySettings } from "../db/schema";
import { AugmentedListener, VERIFY_REGEX } from "../utils/bot";
import { trycatch } from "../utils/general";

@ApplyOptions<Listener.Options>({
    event: Events.MessageCreate
})
export class VerifyRequestListener extends AugmentedListener<"messageCreate"> {
    async run(message: Message) {
        if (!message.guildId) {
            return;
        }
        if (message.author.bot) {
            return;
        }

        const request = VerifyRequestListener.removeMentions(message.content);
        const match = request.match(VERIFY_REGEX);
        if (!match) {
            return;
        }

        const [settings, error] = await trycatch(() =>
            this.db.query.verifySettings.findFirst({
                where: eq(verifySettings.gid, message.guildId!)
            })
        );

        const canProcessRequest = error === null && settings?.type === "message" && message.channelId === settings?.new_user_channel;
        if (!canProcessRequest) {
            return;
        }

        const nick = VerifyRequestListener.formatNickname(match.groups!.nick, match.groups!.team);

        try {
            await this.db
                .insert(verifyEntry)
                .values([
                    {
                        gid: message.guildId,
                        uid: message.author.id,
                        nick
                    }
                ])
                .onConflictDoUpdate({
                    target: [verifyEntry.gid, verifyEntry.uid],
                    set: { nick }
                });
        } catch (error) {
            this.container.logger.error(error);
            this.dmUser(message.author.id, "An error occurred while processing your request, please try again later");
            return;
        }

        this.dmUser(
            message.author.id,
            `Your verification request as ${inlineCode(nick)} has been submitted and is pending review. If your nickname looks incorrect, you may edit your submission by sending a new message containing your name and team in the format ${inlineCode("Name | Team")}.`
        );
    }

    private dmUser(id: Snowflake, message: string) {
        return trycatch(() => this.container.client.users.send(id, message));
    }

    static formatNickname(nick: string, team: string) {
        const formattedTeam = team.toLowerCase() === "no team" ? " | No Team" : ` | ${team}`;
        const sanitizedNick = VerifyRequestListener.removeMentions(nick);
        const truncatedNick = sanitizedNick.slice(0, 32 - formattedTeam.length);
        return `${truncatedNick}${formattedTeam}`;
    }

    static removeMentions(nick: string) {
        return nick.replace(MessageMentions.UsersPattern, "").replace(MessageMentions.ChannelsPattern, "").replace(MessageMentions.EveryonePattern, "").trim();
    }
}
