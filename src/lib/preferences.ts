import { getPreferenceValues } from "@vicinae/api";
import { DEFAULT_PROVIDER, isProviderId } from "../providers";
import type {
	Formality,
	ProviderId,
	ProviderSettings,
} from "../providers/types";
import { AUTO_DETECT } from "./languages";

export type ListLayout = "compact" | "details";

export interface Settings {
	provider: ProviderId;
	deeplApiKey: string;
	formality: Formality;
	langFrom: string;
	lang1: string;
	lang2: string;
	autoInput: boolean;
	instantClipboard: boolean;
	translateOnType: boolean;
	showPronunciation: boolean;
	listLayout: ListLayout;
	defaultAction: "copy" | "paste";
	prioritizeCrossLanguage: boolean;
	ttsPlayer: string;
	proxy: string;
}

const DEFAULTS: Settings = {
	provider: DEFAULT_PROVIDER,
	deeplApiKey: "",
	formality: "default",
	langFrom: AUTO_DETECT,
	lang1: "en",
	lang2: "en",
	autoInput: true,
	instantClipboard: true,
	translateOnType: true,
	showPronunciation: true,
	listLayout: "compact",
	defaultAction: "copy",
	prioritizeCrossLanguage: false,
	ttsPlayer: "",
	proxy: "",
};

export function getSettings(): Settings {
	const values = getPreferenceValues<Partial<Settings>>();
	const settings: Settings = { ...DEFAULTS };
	for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
		const value = values[key];
		if (value !== undefined && value !== null) {
			(settings as unknown as Record<string, unknown>)[key] = value;
		}
	}
	if (!isProviderId(settings.provider)) settings.provider = DEFAULT_PROVIDER;
	return settings;
}

export function providerSettings(settings: Settings): ProviderSettings {
	return {
		proxy: settings.proxy.trim() || undefined,
		apiKeys: { deepl: settings.deeplApiKey.trim() || undefined },
		formality: settings.formality,
	};
}

/** The language set defined by the preferences (Translate from, Primary, Secondary). */
export function preferencesLanguageSet(settings: Settings) {
	const langTo = [...new Set([settings.lang1, settings.lang2])].filter(
		(code) => code && code !== AUTO_DETECT,
	);
	return {
		langFrom: settings.langFrom,
		langTo: langTo.length ? langTo : ["en"],
	};
}
