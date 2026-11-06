import { ALL_LANGUAGE_CODES, AUTO_DETECT } from "../src/lib/languages";
import { PROVIDER_LIST, supportNote } from "../src/providers";
import type { LanguageRole } from "../src/providers/types";
import { languageName } from "../src/lib/languages";

export interface DropdownItem {
	title: string;
	value: string;
}

function languageItems(role: LanguageRole): DropdownItem[] {
	return ALL_LANGUAGE_CODES.map((code) => {
		const note = supportNote(code, role);
		return {
			title: note ? `${languageName(code)} (${note})` : languageName(code),
			value: code,
		};
	});
}

/** Dropdown data of the preferences that are generated from the code. */
export function generatedPreferenceData(): Record<string, DropdownItem[]> {
	return {
		provider: PROVIDER_LIST.map((provider) => ({
			title: provider.name,
			value: provider.id,
		})),
		langFrom: [
			{ title: "Auto-Detect", value: AUTO_DETECT },
			...languageItems("source"),
		],
		lang1: languageItems("target"),
		lang2: languageItems("target"),
	};
}
