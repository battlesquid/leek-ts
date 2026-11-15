import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { getenv } from "./config";
import { getDatabase, getPgPool } from "./db";
import { getLoggerInstance } from "./logger";
import { PinoLoggerAdapter } from "./utils/bot";

const logger = getLoggerInstance("leekbot");

const client = new SapphireClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	],
	logger: {
		level:
			getenv("NODE_ENV") === "development" ? LogLevel.Trace : LogLevel.Info,
		instance: new PinoLoggerAdapter(logger),
	},
	// Without the GuildMembers intent, member update/leave events are never
	// received, so cached members can go stale. Code that depends on a
	// member's roles or permissions fetches with `force: true`; this sweeper
	// keeps the otherwise-unused cache from growing indefinitely.
	sweepers: {
		guildMembers: {
			interval: 3600,
			filter: () => (member) => member.id !== member.client.user.id,
		},
	},
	partials: [
		Partials.Message,
		Partials.Channel,
		Partials.Reaction,
		Partials.GuildMember,
	],
	presence: {
		status: "online",
		activities: [
			{
				type: ActivityType.Watching,
				name: "out for leeks",
			},
		],
	},
});

const main = async () => {
	container.drizzle = await getDatabase();
	container.pool = await getPgPool();
	await client.login(getenv("DISCORD_TOKEN"));
};

const cleanup = () => {
	container.pool.end();
};

main();

process.on("uncaughtException", (error) => {
	console.error(error);
	cleanup();
	process.exit(1);
});

process.on("SIGTERM", () => {
	cleanup();
	process.exit(0);
});

process.on("SIGINT", () => {
	cleanup();
	process.exit(0);
});
