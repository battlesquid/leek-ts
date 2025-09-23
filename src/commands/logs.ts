import { ApplyOptions } from "@sapphire/decorators";
import type { Subcommand } from "@sapphire/plugin-subcommands";
import type { ChannelType } from "discord.js";
import { eq } from "drizzle-orm";
import { logSettings } from "../db/schema";
import { logs } from "../interactions";
import {
    AugmentedSubcommand,
    CommandHints,
    chatInputCommand,
} from "../utils/bot";
import { capitalize } from "../utils/general";

@ApplyOptions<Subcommand.Options>({
    name: logs.commands.chat.base.name,
    subcommands: [
        chatInputCommand(logs.commands.chat.subcommands.enable.name),
        chatInputCommand(logs.commands.chat.subcommands.disable.name),
    ],
    preconditions: ["GuildTextOnly"],
    requiredUserPermissions: logs.permissions,
    requiredClientPermissions: ["ManageMessages"],
})
export class LogsCommand extends AugmentedSubcommand {
    hints() {
        return new CommandHints({
            chat: {
                development: "926913960391893072",
                production: "957187610416144384",
            },
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        const hints = this.hints();
        registry.registerChatInputCommand(logs.commands.chat.base, {
            idHints: [hints.chat.development, hints.chat.production],
        });
    }

    public async chatInputEnable(
        inter: Subcommand.ChatInputCommandInteraction<"cached">,
    ) {
        const logger = this.getCommandLogger(inter);

        const channel = inter.options.getChannel<ChannelType.GuildText>(
            "channel",
            true,
        );
        const type = inter.options.getString("type", true);

        try {
            await this.db
                .insert(logSettings)
                .values([
                    {
                        gid: inter.guildId,
                        [type]: channel.id,
                    },
                ])
                .onConflictDoUpdate({
                    target: logSettings.gid,
                    set: { [type]: channel.id },
                });
            inter.reply(`Enabled ${type} logging on ${channel}.`);
        } catch (error) {
            inter.reply({
                content: "An error occurred while saving your settings.",
                ephemeral: true,
            });
            logger.error({ error }, "An error occurred while saving your settings.");
        }
    }

    public async chatInputDisable(
        inter: Subcommand.ChatInputCommandInteraction<"cached">,
    ) {
        const logger = this.getCommandLogger(inter);
        const type = inter.options.getString("type", true);
        try {
            await this.db
                .update(logSettings)
                .set({ [type]: null })
                .where(eq(logSettings.gid, inter.guildId));
            inter.reply(`${capitalize(type)} logging disabled.`);
        } catch (error) {
            inter.reply({
                content: "An error occurred while saving your settings.",
                ephemeral: true,
            });
            logger.error({ error }, "An error occurred while saving your settings.");
        }
    }
}
