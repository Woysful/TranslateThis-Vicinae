import { Clipboard, closeMainWindow, type LaunchProps } from "@vicinae/api";
import { instantTranslate } from "./lib/instant";

export default async function TranslateAndPaste(
	props: LaunchProps<{ arguments: { text?: string } }>,
) {
	await instantTranslate(
		props.arguments?.text ?? props.fallbackText,
		async (result) => {
			// Vicinae copies the text, waits until the previous window has the focus
			// again, sends the paste shortcut there and restores the clipboard.
			await Clipboard.paste(result.translatedText);
			await closeMainWindow({ clearRootSearch: true });
		},
	);
}
