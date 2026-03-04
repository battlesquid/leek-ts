import { ApplyOptions } from "@sapphire/decorators";
import { container, Events, type Listener } from "@sapphire/framework";
import {
	inlineCode,
	type Message,
	MessageMentions,
	type Snowflake,
} from "discord.js";
import { eq } from "drizzle-orm";
import type pino from "pino";
import { Logger } from "pino";
import { verifyEntry, verifySettings } from "../db/schema";
import {
	AugmentedListener,
	NO_TEAM_REGEX,
	TEAM_NUMBER_REGEX,
	VERIFY_DELIMETER_REGEX,
} from "../utils/bot";
import { trycatch } from "../utils/general";

@ApplyOptions<Listener.Options>({
	event: Events.MessageCreate,
})
export class VerifyRequestListener extends AugmentedListener<
	typeof Events.MessageCreate
> {
	async run(message: Message) {
		const logger = this.getEventLogger(message.guildId);
		if (!message.inGuild()) {
			logger.debug("Event not in guild, exiting.");
			return;
		}
		if (message.author.bot) {
			logger.debug({ user: message.author.id }, "User is a bot, exiting.");
			return;
		}

		const [settings, error] = await trycatch(() =>
			this.db.query.verifySettings.findFirst({
				where: eq(verifySettings.gid, message.guildId),
			}),
		);

		if (error) {
			logger.error(
				{ error },
				"Unable to get verify request settings, exiting.",
			);
			return;
		}

		if (settings?.type !== "message") {
			logger.debug("Message verification is not enabled, exiting.");
			return;
		}
		if (message.channelId !== settings?.new_user_channel) {
			logger.debug("Request is not in new user channel, exiting");
			return;
		}

		const [nick, excluded] = await VerifyRequestListener.parse(message, logger);
		if (!nick) {
			return;
		}

		const excludedMessage =
			excluded.length > 0
				? ` Excluded the following teams from your nickname due to character limit: ${excluded.join(", ")}.`
				: "";

		try {
			await this.db
				.insert(verifyEntry)
				.values([
					{
						gid: message.guildId,
						uid: message.author.id,
						nick,
					},
				])
				.onConflictDoUpdate({
					target: [verifyEntry.gid, verifyEntry.uid],
					set: { nick },
				});
			logger.info(
				{ user: message.author.id, nick },
				"Added verification request",
			);
		} catch (error) {
			logger.error(
				{
					error,
					user: message.author.id,
					username: message.author.username,
				},
				"Unable to add verification request.",
			);
			await VerifyRequestListener.dmUser(
				message.author.id,
				"An error occurred while processing your request, please try again later",
				logger,
			);
			return;
		}

		VerifyRequestListener.dmUser(
			message.author.id,
			`Your verification request as ${inlineCode(nick)} has been submitted and is pending review.${excludedMessage}If your nickname looks incorrect, you may edit your submission by sending a new message containing your name and team in the format ${inlineCode("Name | Team")}.`,
			logger,
		);
	}

	private static async dmUser(
		id: Snowflake,
		message: string,
		logger: pino.Logger<string, boolean>,
	) {
		const result = await trycatch(() =>
			container.client.users.send(id, message),
		);
		if (result[1] !== null) {
			logger.error(
				{ error: result[1] },
				"An error occurred while dm-ing user.",
			);
		}
		return result;
	}

	static formatNickname(nick: string, team: string) {
		const formattedTeam =
			team.toLowerCase() === "no team" ? " | No Team" : `｜${team}`;
		const sanitizedNick = VerifyRequestListener.removeMentions(nick);
		const truncatedNick = sanitizedNick.slice(0, 32 - formattedTeam.length);
		return `${truncatedNick}${formattedTeam}`;
	}

	static removeMentions(nick: string) {
		return nick
			.replace(MessageMentions.UsersPattern, "")
			.replace(MessageMentions.ChannelsPattern, "")
			.replace(MessageMentions.EveryonePattern, "")
			.trim();
	}

	static async verifyTeamExists(team: string) {
		const v5rcExists = await container.robotevents.teams.getByNumber(team, 1);
		if (v5rcExists.data) {
			return true;
		}
		const vurcExists = await container.robotevents.teams.getByNumber(team, 4);
		if (vurcExists.data) {
			return true;
		}
		return false;
	}

	static async parse(
		message: Message,
		logger: pino.Logger<string, boolean>,
	): Promise<[nick: string | undefined, excluded: string[]]> {
		const [name, ...teams] = VerifyRequestListener.removeMentions(
			message.content,
		).split(VERIFY_DELIMETER_REGEX);

		if (teams.length === 0) {
			logger.debug({}, "Verification request is missing teams, exiting.");
			return [undefined, []];
		}

		const [firstTeam, ...otherTeams] = teams.some(NO_TEAM_REGEX.test)
			? ["No Team"]
			: await Promise.all(
					teams
						.map((t) => t.toUpperCase())
						.filter(async (t) => {
							if (!TEAM_NUMBER_REGEX.test(t)) return false;
							return await VerifyRequestListener.verifyTeamExists(t);
						}),
				);

		if (firstTeam === undefined) {
			logger.debug(
				{
					user: message.author.id,
					username: message.author.username,
				},
				"No valid teams provided.",
			);
			await VerifyRequestListener.dmUser(
				message.author.id,
				`There are no valid team numbers present in your request. Please try again with the format ${inlineCode("Name | Team")} (e.g., ${inlineCode("Leekbot | ABCD")} for VURC teams or ${inlineCode("Leekbot | 1234A")} for V5RC teams). If your team number is not yet registered, please use ${inlineCode("No Team")}; you will be able to request a name change later.`,
				logger,
			);
			return [undefined, []];
		}

		const initialNick = `${VerifyRequestListener.removeMentions(name)}｜${firstTeam}`;
		if (initialNick.length > 32) {
			logger.debug(
				{
					user: message.author.id,
					username: message.author.username,
					nick: initialNick,
				},
				`Provided nickname '${initialNick}' is too long.`,
			);
			await VerifyRequestListener.dmUser(
				message.author.id,
				`Your requested nickname '${initialNick}' is too long (${initialNick.length} characters, 32 character limit). Please shorten it and try again.`,
				logger,
			);
			return [undefined, []];
		}

		const excluded: string[] = [];
		const nick = otherTeams.reduce((prev, curr) => {
			const name = `${prev}｜${curr}`;
			if (name.length >= 32) {
				excluded.push(curr);
				return prev;
			}
			return name;
		}, initialNick);

		return [nick, excluded];
	}
}
