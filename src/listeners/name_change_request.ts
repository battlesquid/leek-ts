import { ApplyOptions } from "@sapphire/decorators";
import { Events, type Listener } from "@sapphire/framework";
import type { Message } from "discord.js";
import { eq } from "drizzle-orm";
import { nameChangeRequestSettings } from "../db/schema";
import { AugmentedListener } from "../utils/bot";
import { trycatch } from "../utils/general";

@ApplyOptions<Listener.Options>({
    event: Events.MessageCreate
})
export class NameChangeRequestListener extends AugmentedListener<"messageCreate"> {
    async run(message: Message) {
        if (!message.guildId) {
            return;
        }
        if (message.author.bot) {
            return;
        }

        const [settings, error] = await trycatch(() =>
            this.db.query.nameChangeRequestSettings.findFirst({
                where: eq(nameChangeRequestSettings.gid, message.guildId as string)
            })
        );

        const canProcessRequest = error === null && message.channelId === settings?.channel;
        if (!canProcessRequest) {
            return;
        }

        const [, reactError] = await trycatch(async () => {
            await message.react("✅");
            await message.react("❌");
        });

        if (reactError) {
            return;
        }
    }
}
