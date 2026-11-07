import { showHUD, showToast, Toast } from "@vicinae/api";
import { toTranslateError } from "./errors";
import {
	getSettings,
	preferencesLanguageSet,
	providerSettings,
} from "./preferences";
import { readActiveProvider } from "./state";
import { readInputText } from "./text-source";
import { smartTranslate, type TranslationResult } from "./translate";

const HUD_PREVIEW_LENGTH = 80;

export function preview(text: string) {
	const singleLine = text.replace(/\s+/g, " ").trim();
	return singleLine.length > HUD_PREVIEW_LENGTH
		? `${singleLine.slice(0, HUD_PREVIEW_LENGTH - 1)}…`
		: singleLine;
}

/**
 * Shared flow of the Instant Translate commands: translate the argument (or the
 * selected text) to the primary language, or to the secondary one when the text
 * is already in the primary language, then hand the result over.
 *
 * The Vicinae window stays open until `deliver` runs: a HUD or closing the
 * window first moves the focus away, and then compositors without the
 * data-control protocol refuse the clipboard write.
 */
export async function instantTranslate(
	argumentText: string | undefined,
	deliver: (result: TranslationResult) => Promise<void>,
) {
	const settings = getSettings();
	const provider = readActiveProvider();
	const text = argumentText?.trim()
		? argumentText
		: await readInputText(settings.textSource);

	if (!text.trim()) {
		await showHUD(
			settings.textSource === "selection"
				? "Type the text after the command or select it first"
				: "Type the text after the command, select it or copy it first",
		);
		return;
	}

	const toast = await showToast({
		style: Toast.Style.Animated,
		title: `Translating with ${provider.name}…`,
	});
	let result: TranslationResult;
	try {
		result = await smartTranslate(
			{ provider, settings: providerSettings(settings) },
			text,
			preferencesLanguageSet(settings),
		);
	} catch (error) {
		const translateError = toTranslateError(error);
		console.error("Instant translation failed:", translateError);
		await toast.hide();
		await showHUD(
			translateError.detail
				? `${translateError.title}: ${translateError.detail}`
				: translateError.title,
		);
		return;
	}
	await toast.hide();
	await deliver(result);
}
