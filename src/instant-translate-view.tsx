import {
	type LaunchProps,
	sendDesktopNotification,
	showHUD,
} from "@vicinae/api";
import { instantTranslate } from "./lib/instant";
import { languageName } from "./lib/languages";
import { getSettings } from "./lib/preferences";

const READING_TIME_PER_CHAR_MS = 150;
const MIN_HUD_MS = 2000;
const MAX_HUD_MS = 15000;
const HUD_REFRESH_MS = 1000;

// A HUD disappears after a moment, so it is shown again until the text can be read.
async function showLongHUD(message: string) {
	const duration = Math.min(
		MAX_HUD_MS,
		Math.max(MIN_HUD_MS, message.length * READING_TIME_PER_CHAR_MS),
	);
	await showHUD(message);
	for (let shown = HUD_REFRESH_MS; shown < duration; shown += HUD_REFRESH_MS) {
		await new Promise((resolve) => setTimeout(resolve, HUD_REFRESH_MS));
		await showHUD(message);
	}
}

export default async function InstantTranslateView(
	props: LaunchProps<{ arguments: { text?: string } }>,
) {
	await instantTranslate(
		props.arguments?.text ?? props.fallbackText,
		async (result) => {
			if (getSettings().instantViewStyle === "hud") {
				await showLongHUD(result.translatedText);
				return;
			}
			try {
				await sendDesktopNotification({
					title: `${languageName(result.from)} → ${languageName(result.to)}`,
					body: result.translatedText,
				});
			} catch (error) {
				console.error(
					"Desktop notification failed, falling back to a HUD:",
					error,
				);
				await showLongHUD(result.translatedText);
			}
		},
	);
}
