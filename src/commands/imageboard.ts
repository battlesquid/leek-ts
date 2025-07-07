import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { ChannelType } from "discord.js";
import { eq } from "drizzle-orm";
import { arrayAppend, arrayRemove } from "../db";
import { imageboard as imageboardTable } from "../db/schema";
import { imageboard } from "../interactions";
import { AugmentedSubcommand, CommandHints, chatInputCommand } from "../utils/bot";
import { trycatch } from "../utils/general/try";
import { isNullish } from "@sapphire/utilities";

@ApplyOptions<Subcommand.Options>({
    name: imageboard.commands.chat.base.name,
    subcommands: [
        chatInputCommand(imageboard.commands.chat.subcommands.enable.name),
        chatInputCommand(imageboard.commands.chat.subcommands.disable.name),
        chatInputCommand(imageboard.commands.chat.subcommands.whitelist_add.name),
        chatInputCommand(imageboard.commands.chat.subcommands.whitelist_remove.name),
        chatInputCommand(imageboard.commands.chat.subcommands.enable.name)
    ],
    preconditions: ["GuildTextOnly"],
    requiredUserPermissions: imageboard.permissions,
    requiredClientPermissions: ["ManageMessages"]
})
export class ImageBoardCommand extends AugmentedSubcommand {
    hints() {
        return new CommandHints({
            chat: {
                development: "1119674243404279909",
                production: "957187610416144385"
            }
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        const hints = this.hints();
        registry.registerChatInputCommand(imageboard.commands.chat.base, {
            idHints: [hints.chat.development, hints.chat.production]
        });
    }

    public async chatInputEnable(inter: Subcommand.ChatInputCommandInteraction<"cached">) {
        const logger = this.getCommandLogger(inter);
        const channel = inter.options.getChannel<ChannelType.GuildText>("channel", true);
        const [settings, error] = await this.getSettings(inter.guildId);
        if (error) {
            inter.reply({
                content: "An error occurred while retrieving your settings.",
                ephemeral: true
            });
            logger.error("An error occurred while retrieving your settings.", error);
            return;
        }

        if (settings?.boards.includes(channel.id)) {
            logger.info(`Imageboard already enabled on ${channel}.`);
            return;
        }

        try {
            await this.db
                .insert(imageboardTable)
                .values([
                    {
                        gid: inter.guildId,
                        boards: [channel.id]
                    }
                ])
                .onConflictDoUpdate({
                    target: imageboardTable.gid,
                    set: { boards: arrayAppend(imageboardTable.boards, channel.id) }
                });
            inter.reply(`Enabled imageboard on ${channel}.`);
        } catch (error) {
            logger.error("An error occurred", error);
        }
    }

    public async chatInputDisable(inter: Subcommand.ChatInputCommandInteraction<"cached">) {
        const logger = this.getCommandLogger(inter);
        const channel = inter.options.getChannel<ChannelType.GuildText>("channel", true);

        const [settings, error] = await this.getSettings(inter.guildId);
        if (error) {
            logger.error("An error occurred while retrieving your settings.", error);
            return;
        }
        if (!settings?.boards.includes(channel.id)) {
            inter.reply(`You must enable imageboards on ${channel} first.`);
            return;
        }

        try {
            await this.db
                .update(imageboardTable)
                .set({ boards: arrayRemove(imageboardTable.boards, channel.id) })
                .where(eq(imageboardTable.gid, inter.guildId));
            inter.reply(`Disabled imageboard on ${channel}.`);
        } catch (error) {
            logger.error("An error occurred", error);
        }
    }

    public async chatInputWhitelistAdd(inter: Subcommand.ChatInputCommandInteraction<"cached">) {
        const logger = this.getCommandLogger(inter);

        const role = inter.options.getRole("role", true);
        const [settings, error] = await this.getSettings(inter.guildId);
        if (error) {
            logger.error("An error occurred while retrieving your settings.", error);
            return;
        }
        if (isNullish(settings)) {
            inter.reply("You must set up an imageboard first.");
            return;
        }
        if (settings.whitelist.includes(role.id)) {
            inter.reply("Role is already whitelisted.");
            return;
        }

        try {
            await this.db
                .update(imageboardTable)
                .set({ whitelist: arrayAppend(imageboardTable.whitelist, role.id) })
                .where(eq(imageboardTable.gid, inter.guildId));
            inter.reply(`Added ${role} to imageboard whitelist.`);
        } catch (error) {
            logger.error("An unexpected error occurred.", error);
        }
    }

    public async chatInputWhitelistRemove(inter: Subcommand.ChatInputCommandInteraction<"cached" | "raw">) {
        const logger = this.getCommandLogger(inter);
        const role = inter.options.getRole("role", true);

        const [settings, error] = await this.getSettings(inter.guildId);
        if (error) {
            logger.error("An error occurred while retrieving settings.", error);
            return;
        }
        if (isNullish(settings)) {
            inter.reply("You must set up an imageboard first.");
            return;
        }
        if (!settings.whitelist.includes(role.id)) {
            inter.reply("Role is not whitelisted.");
            return;
        }

        try {
            await this.db
                .update(imageboardTable)
                .set({ whitelist: arrayRemove(imageboardTable.whitelist, role.id) })
                .where(eq(imageboardTable.gid, inter.guildId));
            inter.reply(`Removed ${role} from imageboard whitelist.`);
        } catch (error) {
            logger.error("An unexpected error occurred.", error);
        }
    }

    private async getSettings(guildId: string) {
        return await trycatch(() =>
            this.db.query.imageboard.findFirst({
                where: eq(imageboardTable.gid, guildId)
            })
        );
    }
}
