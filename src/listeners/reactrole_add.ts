import { ApplyOptions } from "@sapphire/decorators";
import { RoleMentionRegex } from "@sapphire/discord.js-utilities";
import { Events, Listener } from "@sapphire/framework";
import type { MessageReaction, User } from "discord.js";
import { ReactRolesCommand } from "../commands/reactroles";
import { trycatch } from "../utils/general";

@ApplyOptions<Listener.Options>({
	event: Events.MessageReactionAdd,
})
export class ReactRoleAddListener extends Listener {
	async run(reaction: MessageReaction, user: User) {
		if (user.bot) {
			return;
		}

		const message = reaction.message.partial
			? await reaction.message.fetch()
			: reaction.message;

		if (!message.inGuild()) {
			return;
		}
		if (message.embeds.length === 0) {
			return;
		}

		const [embed] = message.embeds;
		if (!ReactRolesCommand.isReactRole(embed)) {
			return;
		}

		const field = embed.fields.find(
			(f) => f.name === reaction.emoji.toString(),
		);
		if (!field) {
			return;
		}

		const match = field.value.match(RoleMentionRegex);
		if (!match || !match.groups) {
			return;
		}

		const { id } = match.groups;
		const roleID = id;
		const [role, roleFetchError] = await trycatch(() =>
			message.guild.roles.fetch(roleID),
		);
		if (roleFetchError) {
			return;
		}
		if (role === null) {
			return;
		}

		const [member, memberFetchError] = await trycatch(() =>
			message.guild.members.fetch(user.id),
		);
		if (memberFetchError) {
			return;
		}

		if (!member.roles.cache.has(roleID)) {
			return;
		}

		const [, addRoleError] = await trycatch(() => member.roles.add(role));
		if (addRoleError) {
			this.container.error(
				addRoleError,
				`Unable to add role to ${member.nickname}`,
			);
		}
	}
}
