import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import type { Message } from "discord.js";
import { eq } from "drizzle-orm";
import { nameChangeRequestSettings } from "../db/schema";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
})
export class NameChangeRequestListener extends AugmentedListener<
	typeof Events.MessageCreate
> {
	static ApproveEmoji: string = "✅";
	static RejectEmoji: string = "❌";

	async run(message: Message) {
		const logger = this.getEventLogger(message.guildId);

		if (!message.inGuild()) {
			logger.debug("Message not sent in guild, exiting.");
			return;
		}

		if (message.author.bot) {
			logger.debug({ user: message.author.id }, "User is a bot, exiting.");
			return;
		}

		const [settings, error] = await trycatch(() =>
			this.db.query.nameChangeRequestSettings.findFirst({
				where: eq(nameChangeRequestSettings.gid, message.guildId),
			}),
		);

		if (error) {
			logger.error(
				{ error },
				"Unable to get name change request settings, exiting.",
			);
			return;
		}

		if (message.channelId !== settings?.channel) {
			logger.debug("Message not in name change requests channel, exiting.");
			return;
		}

		const [, reactError] = await trycatch(async () => {
			await message.react(NameChangeRequestListener.ApproveEmoji);
			await message.react(NameChangeRequestListener.RejectEmoji);
		});

		if (reactError) {
			logger.error(
				{ error: reactError },
				"Unable to add reactions to name change request.",
			);
			return;
		}
	}
}
