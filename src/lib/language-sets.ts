import { languageName } from "./languages";
import type { LanguageSet } from "./translate";

export function isSameLanguageSet(a: LanguageSet, b: LanguageSet): boolean {
	return a.langFrom === b.langFrom && a.langTo.join() === b.langTo.join();
}

export function formatLanguageSet(set: LanguageSet): string {
	return `${languageName(set.langFrom)} → ${set.langTo.map(languageName).join(", ")}`;
}

/** Accepts sets saved by older versions, where langTo was a single code. */
export function unifyLanguageSet(value: unknown): LanguageSet | undefined {
	if (!value || typeof value !== "object") return undefined;
	const { langFrom, langTo } = value as {
		langFrom?: unknown;
		langTo?: unknown;
	};
	if (typeof langFrom !== "string") return undefined;
	const targets = (Array.isArray(langTo) ? langTo : [langTo]).filter(
		(code): code is string => typeof code === "string" && code.length > 0,
	);
	return targets.length ? { langFrom, langTo: targets } : undefined;
}
