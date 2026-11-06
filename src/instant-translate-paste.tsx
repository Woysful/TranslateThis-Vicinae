import { Clipboard, closeMainWindow, type LaunchProps } from "@vicinae/api";
import { instantTranslate } from "./lib/instant";

export default async function InstantTranslatePaste(
	props: LaunchProps<{ arguments: { text?: string } }>,
) {
	await instantTranslate(
		props.arguments?.text ?? props.fallbackText,
		async (result) => {
			await closeMainWindow();
			await Clipboard.paste(result.translatedText);
		},
	);
}
