import { ChannelType, PermissionFlagsBits, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { CommandBundle } from ".";
import { combinePermissions } from "../utils/bot/bitwise";

const enable = new SlashCommandSubcommandBuilder()
    .setName("enable")
    .setDescription("Sets a name change request channel.")
    .addChannelOption((opt) =>
        opt
            .setName("channel")
            .setDescription("The channel to set as a name change request channel")
            .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread)
            .setRequired(true)
    );

const disable = new SlashCommandSubcommandBuilder()
    .setName("disable")
    .setDescription("Disables the name change request channel.");

const permissions = [PermissionFlagsBits.ManageNicknames];

const name_change_request = new SlashCommandBuilder()
    .setName("name_change_request")
    .setDescription("Manage name change request channels, channels where user's can request a nickname change.")
    .setDefaultMemberPermissions(combinePermissions(permissions))
    .addSubcommand(enable)
    .addSubcommand(disable);

export default {
    permissions,
    commands: {
        chat: {
            base: name_change_request,
            subcommands: {
                enable,
                disable,
            }
        },
        message: {}
    }
} satisfies CommandBundle<"Subcommand">;
