import { Command, Listener } from "@sapphire/framework";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { randomUUID } from "crypto";
import type {
    ClientEvents,
    ContextMenuCommandInteraction,
    Snowflake,
} from "discord.js";
import { getenv } from "../../config";
import { slashCommandMention } from "./formatters";
import { PinoLoggerAdapter } from "./pino_logger_adapter";

export interface CommandHint {
    development: Snowflake;
    production: Snowflake;
}

export interface CommandHintsOptions {
    chat?: CommandHint;
    message?: CommandHint;
    user?: CommandHint;
}

export class CommandHints {
    readonly chat: CommandHint;
    readonly message: CommandHint;
    readonly user: CommandHint;

    constructor({ chat, message, user }: CommandHintsOptions) {
        this.chat = chat ?? { development: "", production: "" };
        this.message = message ?? { development: "", production: "" };
        this.user = user ?? { development: "", production: "" };
    }

    getChatId() {
        return getenv("NODE_ENV") === "development"
            ? this.chat.development
            : this.chat.production;
    }

    getMessageId() {
        return getenv("NODE_ENV") === "development"
            ? this.message.development
            : this.message.production;
    }

    getUserId() {
        return getenv("NODE_ENV") === "development"
            ? this.user.development
            : this.user.production;
    }
}

export abstract class AugmentedSubcommand extends Subcommand {
    public abstract hints(): CommandHints;

    get db() {
        return this.container.drizzle;
    }

    public getCommandLogger(
        interaction:
            | Subcommand.ChatInputCommandInteraction
            | Command.ChatInputCommandInteraction
            | ContextMenuCommandInteraction,
    ) {
        return (this.container.logger as PinoLoggerAdapter).child({
            guild: interaction.guildId,
            interaction: interaction.commandName,
            type: interaction.commandType,
            hash: randomUUID(),
        });
    }

    public getCommandMention(
        subcommand: string,
        type: keyof CommandHintsOptions,
    ) {
        const hints = this.hints();
        let id = "";
        switch (type) {
            case "chat":
                id = hints.getChatId();
                break;
            case "message":
                id = hints.getMessageId();
                break;
            case "user":
                id = hints.getUserId();
                break;
            default:
                ((_: never) => { })(type);
                break;
        }
        return slashCommandMention(this.name, subcommand, id);
    }
}

export abstract class AugmentedCommand extends Command {
    public abstract hints(): CommandHints;
    
    get db() {
        return this.container.drizzle;
    }

    public getCommandLogger(
        interaction:
            | Subcommand.ChatInputCommandInteraction
            | Command.ChatInputCommandInteraction,
    ) {
        return (this.container.logger as PinoLoggerAdapter).child({
            guild: interaction.guildId,
            interaction: interaction.commandName,
            hash: randomUUID(),
        });
    }

}

export abstract class AugmentedListener<
    T extends keyof ClientEvents,
> extends Listener<T> {
    get db() {
        return this.container.drizzle;
    }

    getEventLogger(eventName: string, guildId: string) {
        return (this.container.logger as PinoLoggerAdapter).child({
            eventName,
            guildId,
            rawEvent: this.event.toString(),
            hash: randomUUID()
        })
    }
}
