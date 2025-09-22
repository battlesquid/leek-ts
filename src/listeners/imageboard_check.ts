import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { isNullish } from "@sapphire/utilities";
import type { Message } from "discord.js";
import { eq } from "drizzle-orm";
import { imageboard } from "../db/schema";
import { URL_REGEX } from "../utils/bot";
import { trycatch } from "../utils/general/try";

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
})
export class ImageboardCheckListener extends Listener {
	async run(msg: Message) {
		if (!msg.inGuild()) {
			return;
		}
		const [settings, error] = await trycatch(() =>
			this.container.drizzle.query.imageboard.findFirst({
				where: eq(imageboard.gid, msg.guildId),
			}),
		);
		if (error) {
			this.container.logger.error(error);
			return;
		}
		if (isNullish(settings)) {
			return;
		}

		const roles = msg.member?.roles.cache;
		const hasNoLink = !URL_REGEX.test(msg.content);
		const hasNoAttachments = msg.attachments.size === 0;
		const locked = settings.boards.includes(msg.channel.id);
		const notWhitelisted = !roles?.hasAny(...settings.whitelist);

		if (locked && hasNoLink && hasNoAttachments && notWhitelisted) {
			trycatch(() => msg.delete());
		}
	}
}
