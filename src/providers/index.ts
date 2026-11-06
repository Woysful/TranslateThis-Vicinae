import { deepl } from "./deepl";
import { google } from "./google";
import type { ProviderId, TranslationProvider } from "./types";

/**
 * Registered providers, in the order they are shown.
 * To add one: implement TranslationProvider, add its id to ProviderId,
 * list it here and run `npm run sync-manifest`.
 */
export const PROVIDERS: Record<ProviderId, TranslationProvider> = {
	google,
	deepl,
};

export const PROVIDER_LIST: readonly TranslationProvider[] =
	Object.values(PROVIDERS);

export const DEFAULT_PROVIDER: ProviderId = "google";

export function isProviderId(value: unknown): value is ProviderId {
	return typeof value === "string" && value in PROVIDERS;
}

export function getProvider(id: string | undefined): TranslationProvider {
	return isProviderId(id) ? PROVIDERS[id] : PROVIDERS[DEFAULT_PROVIDER];
}

/** Providers that do not support a language, for hints in language pickers. */
export function supportNote(code: string, role: "source" | "target"): string {
	const supporting = PROVIDER_LIST.filter((provider) =>
		provider.resolve(code, role),
	);
	if (supporting.length === PROVIDER_LIST.length) return "";
	if (supporting.length === 0) return "not supported";
	return `${supporting.map((provider) => provider.name).join(", ")} only`;
}
