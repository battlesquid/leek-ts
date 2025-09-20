import { TextInputBuilder } from "discord.js";

export class NullishTextInputBuilder extends TextInputBuilder {
	setNullishValue(value: string | null | undefined) {
		if (value !== null && value !== undefined) {
			this.setValue(value);
		}
		return this;
	}
}
