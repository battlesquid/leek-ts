import { ApplyOptions } from "@sapphire/decorators";
import {
	type ChatInputCommandDeniedPayload,
	Events,
	Listener,
	type UserError,
} from "@sapphire/framework";

@ApplyOptions<Listener.Options>({
	name: Events.ChatInputCommandDenied,
})
export class ChatInputCommandDenied extends Listener<
	typeof Events.ChatInputCommandDenied
> {
	public run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
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
