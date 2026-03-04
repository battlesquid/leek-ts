import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { getDatabase, getPgPool } from "./db";
import { getLoggerInstance } from "./logger";
import { PinoLoggerAdapter } from "./utils/bot";
import { getvar } from "./vars";

const logger = getLoggerInstance("leekbot");

const client = new SapphireClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	],
	logger: {
		level:
			getvar("NODE_ENV") === "development" ? LogLevel.Trace : LogLevel.Info,
		instance: new PinoLoggerAdapter(logger),
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
				type: ActivityType.Custom,
				state: "Playing Deadlock",
				name: "",
			},
		],
	},
});

const main = async () => {
	container.drizzle = await getDatabase();
	container.pool = await getPgPool();
	const RobotEvents = (await import("robotevents")).Client;
	container.robotevents = RobotEvents({
		authorization: { token: getvar("ROBOTEVENTS_TOKEN") },
	});
	await client.login(getvar("DISCORD_TOKEN"));
};

const cleanup = () => {
	container.pool.end();
};

main();

process
	.on("uncaughtException", (error) => {
		console.error(error);
		cleanup();
		process.exit(1);
	})
	.on("SIGTERM", () => {
		cleanup();
		process.exit(0);
	})
	.on("SIGINT", () => {
		cleanup();
		process.exit(0);
	});
