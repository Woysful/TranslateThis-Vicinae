export type ProviderId = "google" | "deepl";

export type LanguageRole = "source" | "target";

export type Formality = "default" | "prefer_more" | "prefer_less";

/** Values from the preferences that providers may need. */
export interface ProviderSettings {
	proxy?: string;
	apiKeys: Partial<Record<ProviderId, string>>;
	formality?: Formality;
}

export interface TranslateRequest {
	text: string;
	/** Shared language code, or "auto". */
	from: string;
	/** Shared language code. */
	to: string;
	signal?: AbortSignal;
}

export interface ProviderTranslation {
	translatedText: string;
	/** Shared code of the detected source language, when the provider reports it. */
	detectedFrom?: string;
	/** Romanization of the translation (or of the source text). */
	pronunciation?: string;
}

export interface ProviderUsage {
	used: number;
	limit: number;
	unit: string;
}

/**
 * A translation service. Language codes passed in and out are the shared codes
 * from src/lib/languages.ts; each provider maps them to its own.
 */
export interface TranslationProvider {
	readonly id: ProviderId;
	readonly name: string;
	readonly website: string;
	/** Where to get an API key, for providers that need one. */
	readonly apiKeyUrl?: string;
	/** Longest text accepted in one request, in characters. */
	readonly maxTextLength?: number;
	/** Whether the formality preference applies to this provider. */
	readonly supportsFormality?: boolean;

	/** A message explaining what to set up, or undefined when the provider is ready. */
	configurationError(settings: ProviderSettings): string | undefined;
	/** Shared codes of the languages offered for this role. */
	languages(role: LanguageRole): string[];
	/** The provider's own code for a shared code, or undefined when unsupported. */
	resolve(code: string, role: LanguageRole): string | undefined;
	translate(
		request: TranslateRequest,
		settings: ProviderSettings,
	): Promise<ProviderTranslation>;
	/** URL that opens the same translation on the provider's website. */
	webUrl?(text: string, from: string, to: string): string | undefined;
	getUsage?(
		settings: ProviderSettings,
		signal?: AbortSignal,
	): Promise<ProviderUsage>;
}
