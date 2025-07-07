import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { Attachment, Colors, EmbedBuilder, Message, MessageCreateOptions, TextChannel } from "discord.js";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";
import { logSettings } from "../db/schema";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";

const fetchImage = (url: string) => {
    return new Promise<Buffer>((resolve, reject) => {
        fetch(url)
            .then((response) => response.buffer())
            .then((buffer) => (buffer.length > 0 ? resolve(buffer) : reject()))
            .catch((e) => reject(e));
    });
};

const createPayload = async (attachment: Attachment, message: Message<true>): Promise<MessageCreateOptions | null> => {
    const match = attachment.contentType?.match(/png|jpg|jpeg|gif|webp/);
    if (!match) {
        return null;
    }
    const [ext] = match;
    let buffer: Buffer;
    try {
        buffer = await fetchImage(attachment.proxyURL);
    } catch (error) {
        return null;
    }
    const embed = new EmbedBuilder()
        .setTitle("Image Deleted")
        .setDescription(`Sent by ${message.member} in ${message.channel}`)
        .setColor(Colors.DarkRed)
        .setImage(`attachment://deleted.${ext}`)
        .setTimestamp(Date.now());
    return {
        embeds: [embed],
        files: [
            {
                attachment: buffer,
                name: `deleted.${ext}`,
                description: `deleted by ${message.member} in ${message.channel}`
            }
        ]
    };
};

// TODO add support for plain urls
const handleImageLog = async (message: Message<true>, imageChannel: string, payloads: MessageCreateOptions[]) => {
    const channel = (await message.guild.channels.fetch(imageChannel)) as TextChannel | null;
    if (channel === null) {
        return;
    }

    payloads.forEach(async (payload) => {
        trycatch(() => channel.send(payload));
    });
};

const handleMessageLog = async (message: Message<true>, textChannel: string) => {
    if (isNullishOrEmpty(message.content)) {
        return;
    }

    const channel = (await message.guild.channels.fetch(textChannel)) as TextChannel | null;
    if (channel === null) {
        return;
    }

    const msgs = await message.channel.messages.fetch({
        before: message.id,
        limit: 1
    });
    const first = msgs.first();
    const context = first ? `[Context](${first.url})` : "`No context available`";

    const embed = new EmbedBuilder()
        .setTitle("Message Deleted")
        .setDescription(`Sent by ${message.author} in ${message.channel}\n${context}`)
        .addFields({ name: "Content", value: message.content, inline: false })
        .setColor(Colors.DarkRed)
        .setTimestamp(Date.now());
    try {
        await channel.send({ embeds: [embed] });
    } catch (error) {
        return;
    }
};

@ApplyOptions<Listener.Options>({
    event: Events.MessageDelete
})
export class LogListener extends AugmentedListener<"messageDelete"> {
    async run(message: Message) {
        if (!message.inGuild()) {
            return;
        }

        const pendingPayloads = message.attachments.map((a) => createPayload(a, message));
        const [settings, error] = await trycatch(() =>
            this.db.query.logSettings.findFirst({
                where: eq(logSettings.gid, message.guildId)
            })
        );
        if (isNullish(settings) || error !== null) {
            return;
        }

        if (settings.image) {
            const resolvedPayloads = await Promise.all(pendingPayloads);
            const validPayloads = resolvedPayloads.filter((r): r is MessageCreateOptions => r !== null);
            trycatch(() => handleImageLog(message, settings.image!, validPayloads));
        }
        if (settings.message) {
            trycatch(() => handleMessageLog(message, settings.message!));
        }
    }
}
