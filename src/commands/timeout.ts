import { ApplyOptions } from "@sapphire/decorators";
import {
	isGuildMember,
	isTextBasedChannel,
} from "@sapphire/discord.js-utilities";
import type { Command } from "@sapphire/framework";
import type { Subcommand } from "@sapphire/plugin-subcommands";
import { type GuildBasedChannel, userMention } from "discord.js";
import { eq } from "drizzle-orm";
import ms, { type StringValue } from "ms";
import { logSettings } from "../db/schema";
import { timeout } from "../interactions";
import {
	AugmentedCommand,
	CommandHints,
	ModerationLogBuilder,
} from "../utils/bot";

@ApplyOptions<Subcommand.Options>({
	name: timeout.commands.chat.base.name,
	description: timeout.commands.chat.base.description,
	preconditions: ["GuildTextOnly"],
	requiredUserPermissions: timeout.permissions,
	requiredClientPermissions: ["ModerateMembers", "SendMessages"],
})
export class TimeoutCommand extends AugmentedCommand {
	hints() {
		return new CommandHints({
			chat: {
				development: "950533839120367626",
				production: "957187610416144388",
			},
		});
	}

	public override registerApplicationCommands(registry: Command.Registry) {
		const hints = this.hints();
		registry.registerChatInputCommand(timeout.commands.chat.base, {
			idHints: [hints.chat.development, hints.chat.production],
		});
	}

	public override async chatInputRun(
		inter: Command.ChatInputCommandInteraction<"cached">,
	) {
		const logger = this.logger(inter);

		const member = inter.options.getMember("user");
		const duration = inter.options.getString("duration", true) as StringValue;
		const reason =
			inter.options.getString("reason", false) ?? "no reason provided";

		if (member === null || !isGuildMember(member)) {
			inter.reply("Unable to find member, please try again later.");
			return;
		}

		let millis: number;
		let durationStr: string;
		try {
			millis = ms(duration);
			durationStr = ms(millis);
		} catch (error) {
			inter.reply({
				content: "An invalid duration was provided.",
				ephemeral: true,
			});
			logger.error({ error }, "An invalid duration was provided.");
			return;
		}

		if (millis < 0) {
			inter.reply("Duration must be a positive value");
			return;
		}

		if (millis > ms("28 days")) {
			inter.reply("Duration must be shorter than 28 days");
			return;
		}

		if (Number.isNaN(millis)) {
			inter.reply(`Invalid duration ${duration}`);
			return;
		}

		try {
			await member.disableCommunicationUntil(Date.now() + millis, reason);
			inter.reply(`Timed out ${member} for ${durationStr} (${reason}).`);
		} catch (error) {
			logger.error(
				{ error },
				"An error occurred while timing out user, please try again later.",
			);
			inter.reply({
				content:
					"An error occurred while timing out user, please try again later.",
				ephemeral: true,
			});
			return;
		}

		const settings = await this.db.query.logSettings.findFirst({
			where: eq(logSettings.gid, inter.guildId),
		});
		if (!settings || settings?.moderation === null) {
			return;
		}

		let channel: GuildBasedChannel | null;
		try {
			channel = await inter.guild.channels.fetch(settings.moderation);
		} catch (error) {
			logger.error({ error }, "Unable to retreive moderation logging channel.");
			inter.followUp({
				content: "Unable to retreive moderation logging channel.",
				ephemeral: true,
			});
			// TODO figure out how to detect the channel is truly missing, and not just a fetch error, so that it can be deleted from the db
			return;
		}
		if (!isTextBasedChannel(channel)) {
			inter.reply({
				content:
					"The saved moderation logging channel is not a text channel, removing from settings.",
				ephemeral: true,
			});
			try {
				await this.db
					.update(logSettings)
					.set({ moderation: null })
					.where(eq(logSettings.gid, inter.guildId));
			} catch (error) {
				logger.error(
					{ error },
					"An error occurred while deleting the old moderation log channel",
				);
				inter.followUp({
					content:
						"An error occurred while deleting the old moderation log channel",
					ephemeral: true,
				});
			}
			return;
		}

		const embed = new ModerationLogBuilder("Timeout Administered", inter.user)
			.addField("User", userMention(member.id))
			.addField("Reason", reason, true)
			.addField("Duration", durationStr, true)
			.build()
			.setColor("#edbc37")
			.setTimestamp(Date.now());

		try {
			await channel.send({ embeds: [embed] });
		} catch (error) {
			logger.error(
				{ error },
				"An error occurred while recording the timeout log.",
			);
			inter.followUp({
				content: "An error occurred while recording the timeout log.",
				ephemeral: true,
			});
		}
	}
}
