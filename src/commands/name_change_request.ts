import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { ChannelType } from "discord.js";
import { eq } from "drizzle-orm";
import { nameChangeRequestSettings } from "../db/schema";
import name_change_request from "../interactions/name_change_request";
import { AugmentedSubcommand, chatInputCommand, CommandHints } from "../utils/bot";

@ApplyOptions<Subcommand.Options>({
    name: name_change_request.commands.chat.base.name,
    subcommands: [chatInputCommand(name_change_request.commands.chat.subcommands.enable.name), chatInputCommand(name_change_request.commands.chat.subcommands.disable.name)],
    preconditions: ["GuildTextOnly"],
    requiredUserPermissions: name_change_request.permissions,
    requiredClientPermissions: ["ManageNicknames", "AddReactions"]
})
export class LogsCommand extends AugmentedSubcommand {
    hints() {
        return new CommandHints({
            chat: {
                development: "",
                production: ""
            }
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        const hints = this.hints();
        registry.registerChatInputCommand(name_change_request.commands.chat.base, {
            idHints: [hints.chat.development, hints.chat.production]
        });
    }

    public async chatInputEnable(inter: Subcommand.ChatInputCommandInteraction<"cached">) {
        const logger = this.getCommandLogger(inter);
        const channel = inter.options.getChannel<ChannelType.GuildText>("channel", true);

        try {
            await this.db
                .insert(nameChangeRequestSettings)
                .values([
                    {
                        gid: inter.guildId,
                        channel: channel.id
                    }
                ])
                .onConflictDoUpdate({
                    target: nameChangeRequestSettings.gid,
                    set: { channel: channel.id }
                });
            inter.reply(`Enabled name change requests on ${channel}.`);
        } catch (error) {
            inter.reply({
                content: "An error occurred while saving your settings.",
                ephemeral: true
            });
            logger.error("An error occurred while saving your settings.", error);
        }
    }

    public async chatInputDisable(inter: Subcommand.ChatInputCommandInteraction<"cached">) {
        const logger = this.getCommandLogger(inter);
        try {
            await this.db.delete(nameChangeRequestSettings).where(eq(nameChangeRequestSettings.gid, inter.guildId));
            inter.reply("Name change requests have been disabled.");
        } catch (error) {
            inter.reply({
                content: "An error occurred while saving your settings.",
                ephemeral: true
            });
            logger.error("An error occurred while saving your settings.", error);
        }
    }
}
