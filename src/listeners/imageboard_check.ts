import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import type { Message } from "discord.js";
import { eq } from "drizzle-orm";
import { imageboard } from "../db/schema";
import { AugmentedListener, URL_REGEX } from "../utils/bot";
import { trycatch } from "../utils/general/try";

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
})
export class ImageboardCheckListener extends AugmentedListener<
	typeof Events.MessageCreate
> {
	async run(message: Message) {
		const logger = this.getEventLogger(message.guildId);
		if (!message.inGuild()) {
			logger.debug("Message not sent in guild, exiting.");
			return;
		}
		const [settings, error] = await trycatch(() =>
			this.db.query.imageboard.findFirst({
				where: eq(imageboard.gid, message.guildId),
			}),
		);
		if (error) {
			logger.error({ error }, "Unable to get imageboard settings.");
			return;
		}
		if (isNullish(settings)) {
			logger.debug("Imageboards not enabled for this server, exiting.");
			return;
		}

		const roles = message.member?.roles.cache;
		const hasNoLink = !URL_REGEX.test(message.content);
		const hasNoAttachments = message.attachments.size === 0;
		const locked = settings.boards.includes(message.channel.id);
		const notWhitelisted = !roles?.hasAny(...settings.whitelist);

		logger.debug({
			hasNoLink,
			hasNoAttachments,
			locked,
			notWhitelisted,
			roles: Array.from(roles?.keys() ?? []),
			whitelist: settings.whitelist,
		});

		if (locked && hasNoLink && hasNoAttachments && notWhitelisted) {
			logger.debug("Detected message in imageboard without media, deleting.");
			const [, error] = await trycatch(() => message.delete());
			if (error) {
				logger.error({ error });
			}
		}
	}
}
