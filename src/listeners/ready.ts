import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import { AugmentedListener } from "../utils/bot";
import { getvar } from "../vars";

@ApplyOptions<Listener.Options>({
	once: true,
	event: Events.ClientReady,
})
export class ReadyListener extends AugmentedListener<
	typeof Events.ClientReady
> {
	run() {
		this.container.logger.info(`leekbot online (${getvar("NODE_ENV")})`);
	}
}
