import type { Snowflake } from "discord.js";
import { inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

/**
 * Every table that stores per-guild data. Any new table keyed by `gid` must be
 * added here so its data is removed when the bot leaves a guild.
 */
const GUILD_TABLES = [
	schema.hallOfFameSettings,
	schema.imageboard,
	schema.logSettings,
	schema.nameChangeRequestSettings,
	schema.verifyEntry,
	schema.verifySettings,
] as const;

/**
 * Deletes all stored data for the given guilds in a single transaction.
 */
export const purgeGuildData = async (db: Database, guildIds: Snowflake[]) => {
	if (guildIds.length === 0) {
		return;
	}
	await db.transaction(async (tx) => {
		for (const table of GUILD_TABLES) {
			await tx.delete(table).where(inArray(table.gid, guildIds));
		}
	});
};

/**
 * Returns the IDs of every guild that has data stored in any table.
 */
export const getStoredGuildIds = async (db: Database) => {
	const results = await Promise.all(
		GUILD_TABLES.map((table) =>
			db.selectDistinct({ gid: table.gid }).from(table),
		),
	);
	return new Set(results.flat().map((row) => row.gid));
};
