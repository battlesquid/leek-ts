import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import type { Client } from "discord.js";
import { getStoredGuildIds, purgeGuildData } from "../db/purge";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";

/**
 * On startup, deletes stored data for guilds the bot is no longer in. This
 * covers removals that happened while the bot was offline, which never produce
 * a GuildDelete event.
 */
@ApplyOptions<Listener.Options>({
	once: true,
	event: Events.ClientReady,
})
export class GuildDataReconcileListener extends AugmentedListener<
	typeof Events.ClientReady
> {
	async run(client: Client<true>) {
		const logger = this.getEventLogger();

		// With a ShardingManager, each process only knows about its own shard's
		// guilds, so every other shard's guilds would look like removals.
		if (client.shard !== null) {
			logger.info("Running under a ShardingManager, skipping reconcile.");
			return;
		}
		// The READY payload lists every guild the bot is in, including
		// unavailable ones. An empty list is far more likely to be a problem than
		// a real state, so don't treat it as "removed from everything".
		if (client.guilds.cache.size === 0) {
			logger.warn("Guild cache is empty, skipping reconcile.");
			return;
		}

		const [stored, storedError] = await trycatch(() =>
			getStoredGuildIds(this.db),
		);
		if (storedError) {
			logger.error({ error: storedError }, "Unable to load stored guild IDs.");
			return;
		}

		const removed = [...stored].filter((id) => !client.guilds.cache.has(id));
		if (removed.length === 0) {
			logger.info("No data stored for removed guilds.");
			return;
		}

		const [, purgeError] = await trycatch(() =>
			purgeGuildData(this.db, removed),
		);
		if (purgeError) {
			logger.error(
				{ error: purgeError, guilds: removed },
				"Unable to delete data for removed guilds.",
			);
			return;
		}
		logger.info(
			{ guilds: removed },
			`Deleted stored data for ${removed.length} removed guild(s).`,
		);
	}
}
