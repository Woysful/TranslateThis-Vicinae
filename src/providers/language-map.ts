import { baseLanguage, normalizeLanguage } from "../lib/languages";
import type { LanguageRole } from "./types";

export interface LanguageEntry {
	/** Shared language code. */
	code: string;
	/** Provider code when the language can be translated from. */
	source?: string;
	/** Provider code when the language can be translated to. */
	target?: string;
}

/**
 * Maps shared language codes to a provider's codes. When a regional variant is
 * missing, the base language is used instead (en-GB -> en).
 * For reverse lookups the first entry wins, so list main languages before variants.
 */
export class LanguageMap {
	private readonly entries: readonly LanguageEntry[];
	private readonly byCode = new Map<string, LanguageEntry>();
	private readonly byProviderCode = new Map<string, string>();

	constructor(entries: readonly LanguageEntry[]) {
		this.entries = entries;
		for (const entry of entries) {
			this.byCode.set(entry.code, entry);
			for (const providerCode of [entry.source, entry.target]) {
				const key = providerCode?.toLowerCase();
				if (key && !this.byProviderCode.has(key)) {
					this.byProviderCode.set(key, entry.code);
				}
			}
		}
	}

	codes(role: LanguageRole): string[] {
		return this.entries
			.filter((entry) => entry[role])
			.map((entry) => entry.code);
	}

	resolve(code: string, role: LanguageRole): string | undefined {
		const canonical = normalizeLanguage(code);
		const exact = this.byCode.get(canonical)?.[role];
		if (exact) return exact;
		const base = normalizeLanguage(baseLanguage(canonical));
		return base === canonical ? undefined : this.byCode.get(base)?.[role];
	}

	/** Shared code for a code returned by the provider (e.g. a detected language). */
	toShared(providerCode: string): string {
		return (
			this.byProviderCode.get(providerCode.toLowerCase()) ??
			normalizeLanguage(providerCode)
		);
	}
}
