import { ApplyOptions } from "@sapphire/decorators";
import { RoleMentionRegex } from "@sapphire/discord.js-utilities";
import { Events, type Listener } from "@sapphire/framework";
import type { MessageReaction, User } from "discord.js";
import { ReactRolesCommand } from "../commands/reactroles";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";

@ApplyOptions<Listener.Options>({
	event: Events.MessageReactionRemove,
})
export class ReactRoleRemoveListener extends AugmentedListener<
	typeof Events.MessageReactionRemove
> {
	async run(reaction: MessageReaction, user: User) {
		const logger = this.getEventLogger(reaction.message.guildId);

		if (user.bot) {
			logger.debug({ user: user.id }, "User is a bot, exiting.");
			return;
		}

		const [message, messageError] = await trycatch(async () => {
			if (reaction.message.partial) {
				logger.debug("Message is partial, fetching");
				return reaction.message.fetch();
			}
			return reaction.message;
		});

		if (messageError) {
			logger.error(
				{ error: messageError },
				"Unable to fetch partial message, exiting.",
			);
			return;
		}

		if (!message.inGuild()) {
			logger.debug("Message not sent in guild, exiting.");
			return;
		}
		if (message.embeds.length === 0) {
			logger.debug("No embeds on message, exiting.");
			return;
		}

		const [embed] = message.embeds;
		if (!ReactRolesCommand.isReactRole(embed)) {
			logger.debug("Embed is not a react-role embed, exiting.");
			return;
		}

		const field = embed.fields.find(
			(f) => f.name === reaction.emoji.toString(),
		);
		if (!field) {
			logger.debug(`No role found for emoji ${reaction.emoji}, exiting.`);
			return;
		}

		const match = field.value.match(RoleMentionRegex);
		if (!match || !match.groups) {
			logger.debug(`${field.value} does not match role regex, exiting`);
			return;
		}

		const { id: targetRole } = match.groups;
		const [role, roleFetchError] = await trycatch(() =>
			message.guild.roles.fetch(targetRole),
		);
		if (roleFetchError) {
			logger.error(
				{ error: roleFetchError, targetRole },
				"An error occurred while fetching the role, exiting.",
			);
			return;
		}
		if (role === null) {
			logger.warn(`No role found for role ${role}, exiting.`);
			return;
		}

		const [member, memberFetchError] = await trycatch(() =>
			message.guild.members.fetch(user.id),
		);
		if (memberFetchError) {
			logger.error(
				{ error: memberFetchError, user: user.id },
				"An error occurred while fetching the reacting member, exiting.",
			);
			return;
		}

		if (!member.roles.cache.has(targetRole)) {
			logger.debug(
				{
					roles: member.roles.cache.map((r) => r.id),
					targetRole,
				},
				"User doesn't have role already, exiting.",
			);
			return;
		}

		const [, removeRoleError] = await trycatch(() => member.roles.remove(role));
		if (removeRoleError) {
			logger.error(
				{ removeRoleError, targetRole },
				"Unable to remove role from user",
			);
		}
	}
}
