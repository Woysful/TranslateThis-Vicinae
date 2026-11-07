import { Clipboard } from "@vicinae/api";

/** Text from the clipboard, or "" when it holds no text. */
export async function readClipboardText(): Promise<string> {
	try {
		return (await Clipboard.readText()) ?? "";
	} catch {
		return "";
	}
}
