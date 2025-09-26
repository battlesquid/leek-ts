import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import {
	inlineCode,
	type Message,
	MessageMentions,
	type Snowflake,
} from "discord.js";
import { eq } from "drizzle-orm";
import { verifyEntry, verifySettings } from "../db/schema";
import { AugmentedListener, VERIFY_REGEX } from "../utils/bot";
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

		const request = VerifyRequestListener.removeMentions(message.content);
		const match = request.match(VERIFY_REGEX);
		if (!match || !match.groups) {
			logger.debug({}, "Message does not match verification regex, exiting.");
			return;
		}
		const { name, team } = match.groups;

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
		if (message.channelId === settings?.new_user_channel) {
			logger.debug("Request is not in new user channel, exiting");
			return;
		}

		const nick = VerifyRequestListener.formatNickname(name, team);

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
			logger.info({ user: message.author.id }, "Added verification request");
		} catch (error) {
			logger.error(
				{
					error,
					user: message.author.id,
					username: message.author.username,
				},
				"Unable to add verification request.",
			);
			const [, dmUserError] = await this.dmUser(
				message.author.id,
				"An error occurred while processing your request, please try again later",
			);
			if (dmUserError) {
				logger.error(
					{ error: dmUserError },
					"An error occurred while dm-ing verified user.",
				);
			}
			return;
		}

		const [, dmUserError] = await this.dmUser(
			message.author.id,
			`Your verification request as ${inlineCode(nick)} has been submitted and is pending review. If your nickname looks incorrect, you may edit your submission by sending a new message containing your name and team in the format ${inlineCode("Name | Team")}.`,
		);
		if (dmUserError) {
			logger.error(
				{ error: dmUserError },
				"An error occurred while dm-ing verified user.",
			);
		}
	}

	private dmUser(id: Snowflake, message: string) {
		return trycatch(() => this.container.client.users.send(id, message));
	}

	static formatNickname(nick: string, team: string) {
		const formattedTeam =
			team.toLowerCase() === "no team" ? " | No Team" : ` | ${team}`;
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
}
