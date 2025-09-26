import { ApplyOptions } from "@sapphire/decorators";
import {
	type ChatInputCommandErrorPayload,
	Events,
	type Listener,
} from "@sapphire/framework";
import { AugmentedListener } from "../utils/bot";

@ApplyOptions<Listener.Options>({
	name: Events.ChatInputCommandDenied,
})
export class CommandErrorListener extends AugmentedListener<
	typeof Events.ChatInputCommandError
> {
	run(error: unknown, payload: ChatInputCommandErrorPayload): unknown {
		const logger = this.getEventLogger(payload.interaction.guildId);
		const {
			interaction: { type, context, commandName },
			duration,
		} = payload;
		const raw = payload.interaction.toJSON();
		logger.error({
			error,
			commandName,
			duration,
			type,
			context,
			raw,
		});
		return;
	}
}
