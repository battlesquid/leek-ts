import { EmbedBuilder, type User } from "discord.js";

export class ModerationLogBuilder {
	private embed: EmbedBuilder;

	constructor(action: string, initiatior: User) {
		this.embed = new EmbedBuilder().setTitle(action).setFooter({
			text: `Initiated by ${initiatior.username}`,
			iconURL: initiatior.avatarURL() ?? undefined,
		});
	}

	addField(name: string, value: string, inline?: boolean) {
		this.embed.addFields({ name, value, inline });
		return this;
	}

	build() {
		return EmbedBuilder.from(this.embed);
	}
}
