import type { Container as FrameworkContainer } from "@sapphire/framework";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type * as schema from "./db/schema";
import type { PinoLoggerAdapter } from "./utils/bot";

declare module "@sapphire/pieces" {
	export interface Container extends Omit<FrameworkContainer, "logger"> {
		drizzle: NodePgDatabase<typeof schema>;
		pool: Pool;
		logger: PinoLoggerAdapter;
	}
}
