import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import {
	type Attachment,
	Colors,
	EmbedBuilder,
	type Message,
	type MessageCreateOptions,
	type TextChannel,
} from "discord.js";
import { eq } from "drizzle-orm";
import { logSettings } from "../db/schema";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";

const fetchImage = (url: string) => {
	return new Promise<Buffer>((resolve, reject) => {
		fetch(url)
			.then((response) => response.arrayBuffer())
			.then((buffer) =>
				buffer.byteLength > 0 ? resolve(Buffer.from(buffer)) : reject(),
			)
			.catch((e) => reject(e));
	});
};

const createPayload = async (
	attachment: Attachment,
	message: Message<true>,
): Promise<MessageCreateOptions | null> => {
	const match = attachment.contentType?.match(/png|jpg|jpeg|gif|webp/);
	if (!match) {
		return null;
	}
	const [ext] = match;
	const [buffer, error] = await trycatch(() => fetchImage(attachment.proxyURL));
	if (error) {
		return null;
	}
	const msgs = await message.channel.messages.fetch({
		before: message.id,
		limit: 1,
	});
	const first = msgs.first();
	const context = first ? `[Context](${first.url})` : "`No context available`";
	const embed = new EmbedBuilder()
		.setTitle("Image Deleted")
		.setDescription(
			`Sent by ${message.member} in ${message.channel}\n${context}`,
		)
		.setColor(Colors.DarkRed)
		.setImage(`attachment://deleted.${ext}`)
		.setTimestamp(Date.now());
	return {
		embeds: [embed],
		files: [
			{
				attachment: buffer,
				name: `deleted.${ext}`,
				description: `deleted by ${message.member} in ${message.channel}`,
			},
		],
	};
};

// TODO add support for plain urls
const handleImageLog = async (
	message: Message<true>,
	imageChannel: string,
	payloads: MessageCreateOptions[],
) => {
	const channel = (await message.guild.channels.fetch(
		imageChannel,
	)) as TextChannel | null;
	if (channel === null) {
		return;
	}

	payloads.forEach((payload) => {
		trycatch(() => channel.send(payload));
	});
};

const handleMessageLog = async (
	message: Message<true>,
	textChannel: string,
) => {
	if (isNullishOrEmpty(message.content)) {
		return;
	}

	const channel = (await message.guild.channels.fetch(
		textChannel,
	)) as TextChannel | null;
	if (channel === null) {
		return;
	}

	const msgs = await message.channel.messages.fetch({
		before: message.id,
		limit: 1,
	});
	const first = msgs.first();
	const context = first ? `[Context](${first.url})` : "`No context available`";

	const embed = new EmbedBuilder()
		.setTitle("Message Deleted")
		.setDescription(
			`Sent by ${message.author} in ${message.channel}\n${context}`,
		)
		.addFields({ name: "Content", value: message.content, inline: false })
		.setColor(Colors.DarkRed)
		.setTimestamp(Date.now());

	await trycatch(() => channel.send({ embeds: [embed] }));
};

@ApplyOptions<Listener.Options>({
	event: Events.MessageDelete,
})
export class LogListener extends AugmentedListener<
	typeof Events.MessageDelete
> {
	async run(message: Message<true>) {
		const logger = this.getEventLogger(message.guildId);
		if (!message.inGuild()) {
			logger.debug("Message not sent in guild, exiting.");
			return;
		}

		const pendingPayloads = message.attachments.map((a) =>
			createPayload(a, message),
		);
		const [settings, error] = await trycatch(() =>
			this.db.query.logSettings.findFirst({
				where: eq(logSettings.gid, message.guildId),
			}),
		);

		if (error) {
			logger.error({ error }, "Unable to get log settings.");
			return;
		}
		if (isNullish(settings)) {
			logger.debug("Logs not enabled, exiting.");
			return;
		}

		const { image: imageId, message: messageId } = settings;

		if (imageId !== null) {
			const resolvedPayloads = await Promise.all(pendingPayloads);
			const validPayloads = resolvedPayloads.filter(
				(r): r is MessageCreateOptions => r !== null,
			);
			const [, error] = await trycatch(() =>
				handleImageLog(message, imageId, validPayloads),
			);
			if (error) {
				logger.error({ error });
			}
		}
		if (messageId !== null) {
			const [, error] = await trycatch(() =>
				handleMessageLog(message, messageId),
			);
			if (error) {
				logger.error({ error });
			}
		}
	}
}
