import "@sapphire/framework";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type * as schema from "./db/schema";
import type { Container as FrameworkContainer } from "@sapphire/framework";
import type { Container as PiecesContainer } from "@sapphire/pieces";
import { PinoLoggerAdapter } from "./utils/bot";

declare module "@sapphire/pieces" {
    export interface Container {
        drizzle: NodePgDatabase<typeof schema>;
        pool: Pool;
        logger: PinoLoggerAdapter;
        error: (err: Error | unknown, message: string) => void;
    }
}
