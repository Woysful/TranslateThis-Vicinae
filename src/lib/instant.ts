import { showHUD } from "@vicinae/api";
import { toTranslateError } from "./errors";
import {
	getSettings,
	preferencesLanguageSet,
	providerSettings,
} from "./preferences";
import { readActiveProvider } from "./state";
import { readInputText } from "./text-source";
import { smartTranslate, type TranslationResult } from "./translate";

/**
 * Shared flow of the Instant Translate commands: translate the argument, the
 * selection or the clipboard to the primary language (or the secondary one when
 * the text is already in the primary language), then hand the result over.
 */
export async function instantTranslate(
	argumentText: string | undefined,
	onTranslated: (result: TranslationResult) => Promise<void>,
) {
	const settings = getSettings();
	const provider = readActiveProvider();
	const text = argumentText?.trim()
		? argumentText
		: await readInputText(settings.textSource);

	if (!text.trim()) {
		await showHUD(
			settings.textSource === "selection"
				? "No text selected"
				: "No text selected or in the clipboard",
		);
		return;
	}

	try {
		await showHUD(`Translating with ${provider.name}…`);
		const result = await smartTranslate(
			{ provider, settings: providerSettings(settings) },
			text,
			preferencesLanguageSet(settings),
		);
		await onTranslated(result);
	} catch (error) {
		const translateError = toTranslateError(error);
		console.error("Instant translation failed:", translateError);
		await showHUD(
			translateError.detail
				? `${translateError.title}: ${translateError.detail}`
				: translateError.title,
		);
	}
}
