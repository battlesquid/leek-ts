import "@sapphire/framework";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type * as schema from "./db/schema";

declare module "@sapphire/pieces" {
	interface Container {
		drizzle: NodePgDatabase<typeof schema>;
		pool: Pool;
		error: (err: Error | unknown, message: string) => void;
	}
}
