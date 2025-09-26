import { ApplyOptions } from "@sapphire/decorators";
import {
	type ChatInputCommandDeniedPayload,
	Events,
	type Listener,
	type UserError,
} from "@sapphire/framework";
import { AugmentedListener } from "../utils/bot";

@ApplyOptions<Listener.Options>({
	name: Events.ChatInputCommandDenied,
})
export class ChatInputCommandDenied extends AugmentedListener<
	typeof Events.ChatInputCommandDenied
> {
	public run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
		const logger = this.getEventLogger(interaction.guildId);
		logger.error({ error });

		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({
				content: error.message,
			});
		}

		return interaction.reply({
			content: error.message,
			ephemeral: true,
		});
	}
}
