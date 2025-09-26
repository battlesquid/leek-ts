import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgColumn } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { getenv } from "../config";
import * as schema from "./schema";

let DATABASE: NodePgDatabase<typeof schema> | null = null;
let connection: Pool | null = null;

export const getPgPool = async () => {
	connection ??= new Pool({
		host: getenv("DB_HOST"),
		port: parseInt(getenv("DB_PORT"), 10),
		user: getenv("DB_USER"),
		password: getenv("DB_PASSWORD"),
		database: getenv("DB_NAME"),
	});
	return connection;
};

export const getDatabase = async (): Promise<NodePgDatabase<typeof schema>> => {
	if (DATABASE === null) {
		const pool = await getPgPool();
		await pool.connect();
		DATABASE = drizzle(pool, { schema });
	}
	return DATABASE;
};

export const arrayAppend = (column: PgColumn, value: unknown) => {
	return sql`array_append(${column}, ${value})`;
};

export const arrayRemove = (column: PgColumn, value: unknown) => {
	return sql`array_remove(${column}, ${value})`;
};

export const arrayReplace = (
	column: PgColumn,
	target: unknown,
	replacement: unknown,
) => {
	return sql`array_replace(${column}, ${target}, ${replacement})`;
};
