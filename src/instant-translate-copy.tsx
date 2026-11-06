import { Clipboard, type LaunchProps, showHUD } from "@vicinae/api";
import { instantTranslate } from "./lib/instant";

export default async function InstantTranslateCopy(
	props: LaunchProps<{ arguments: { text?: string } }>,
) {
	await instantTranslate(
		props.arguments?.text ?? props.fallbackText,
		async (result) => {
			await Clipboard.copy(result.translatedText);
			await showHUD(`Copied: ${result.translatedText}`);
		},
	);
}
