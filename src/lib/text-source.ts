import { Clipboard, getSelectedText } from "@vicinae/api";
import type { TextSource } from "./preferences";

async function selection(): Promise<string> {
	try {
		return (await getSelectedText()) ?? "";
	} catch {
		return "";
	}
}

async function clipboard(): Promise<string> {
	try {
		return (await Clipboard.readText()) ?? "";
	} catch {
		return "";
	}
}

/** Text to translate from the selection or the clipboard, depending on the preference. */
export async function readInputText(source: TextSource): Promise<string> {
	if (source === "clipboard") {
		const text = await clipboard();
		return text.trim() ? text : selection();
	}
	const text = await selection();
	if (text.trim() || source === "selection") return text;
	return clipboard();
}
