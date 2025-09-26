import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import { getenv } from "../config";
import { AugmentedListener } from "../utils/bot";

@ApplyOptions<Listener.Options>({
	once: true,
	event: Events.ClientReady,
})
export class ReadyListener extends AugmentedListener<
	typeof Events.ClientReady
> {
	run() {
		this.container.logger.info(`leekbot online (${getenv("NODE_ENV")})`);
	}
}
