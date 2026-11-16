import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { purgeGuildData } from "../db/purge";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";

/**
 * Deletes all of a guild's stored data when the bot is removed from it (kicked,
 * banned, or the guild is deleted). discord.js emits GuildUnavailable rather
 * than GuildDelete during outages, so this does not fire for those.
 */
@ApplyOptions<Listener.Options>({
	event: Events.GuildDelete,
})
export class GuildDeleteListener extends AugmentedListener<
	typeof Events.GuildDelete
> {
	async run(guild: Guild) {
		const logger = this.getEventLogger(guild.id);
		const [, error] = await trycatch(() => purgeGuildData(this.db, [guild.id]));
		if (error) {
			logger.error({ error }, "Unable to delete data for removed guild.");
			return;
		}
		logger.info("Removed from guild, deleted all stored data.");
	}
}
