import { sql } from "drizzle-orm";
import {
	boolean,
	pgTable,
	primaryKey,
	text,
	varchar,
} from "drizzle-orm/pg-core";

export const imageboard = pgTable("imageboard", {
	gid: varchar("gid").primaryKey(),
	boards: text("boards").array().notNull(),
	whitelist: text("whitelist").array().default(sql`'{}'::text[]`).notNull(),
});

export const logSettings = pgTable("log_settings", {
	gid: varchar("gid").primaryKey(),
	message: varchar("message"),
	image: varchar("image"),
	moderation: varchar("moderation"),
});

export const verifyEntry = pgTable(
	"verify_entry",
	{
		gid: varchar("gid").notNull(),
		uid: varchar("uid").notNull(),
		nick: varchar("nick", { length: 32 }).notNull(),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.gid, table.uid] }),
		};
	},
);

export type VerifyUser = typeof verifyEntry.$inferSelect;

export const verifySettings = pgTable("verify_settings", {
	gid: varchar("gid").primaryKey(),
	type: varchar("type").default("message").notNull(),
	new_user_channel: varchar("new_user_channel"),
	roles: text("roles").array().notNull(),
	create_greeting: boolean("create_greeting").default(false).notNull(),
});

export type VerifySettings = typeof verifySettings.$inferSelect;

export const hallOfFameSettings = pgTable("hall_of_fame", {
	gid: varchar("gid").primaryKey(),
	halls: text("halls").array().default(sql`'{}'::text[]`).notNull(),
});

export const nameChangeRequestSettings = pgTable("name_change_request", {
    gid: varchar("gid").primaryKey(),
    channel: varchar("channel").notNull()
});
