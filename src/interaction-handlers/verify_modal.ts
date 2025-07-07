import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { type ModalSubmitInteraction } from "discord.js";
import { verifyEntry } from "../db/schema";
import { VerifyRequestListener } from "../listeners/verify_request";
import { trycatch } from "../utils/general";

@ApplyOptions<InteractionHandler.Options>({
    interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class VerifyModalHandler extends InteractionHandler {
    static MODAL_ID = "@leekbot/verify_modal";
    static NAME_INPUT = "@leekbot/name_input";
    static TEAM_INPUT = "@leekbot/team_input";

    public override parse(interaction: ModalSubmitInteraction) {
        if (interaction.customId !== VerifyModalHandler.MODAL_ID) {
            return this.none();
        }
        return this.some();
    }

    public async run(inter: ModalSubmitInteraction<"cached">) {
        const name = inter.fields.getTextInputValue(VerifyModalHandler.NAME_INPUT);
        const team = inter.fields.getTextInputValue(VerifyModalHandler.TEAM_INPUT);
        const nick = VerifyRequestListener.formatNickname(name, team);

        const [, upsertError] = await trycatch(() =>
            this.container.drizzle
                .insert(verifyEntry)
                .values([
                    {
                        gid: inter.guildId,
                        nick,
                        uid: inter.user.id
                    }
                ])
                .onConflictDoUpdate({
                    target: [verifyEntry.gid, verifyEntry.uid],
                    set: { nick }
                })
        );

        if (upsertError) {
            inter.reply({
                content: "An error occurred while submitting your request, please try again later.",
                ephemeral: true
            });
            return;
        }

        inter.reply({
            content: "Your verification request was sent.",
            ephemeral: true
        });
    }
}
