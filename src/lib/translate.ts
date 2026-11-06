import type {
	ProviderId,
	ProviderSettings,
	TranslationProvider,
} from "../providers/types";
import { isAbortError, TranslateError, toTranslateError } from "./errors";
import {
	AUTO_DETECT,
	isSameLanguage,
	languageName,
	normalizeLanguage,
} from "./languages";

export interface LanguageSet {
	langFrom: string;
	langTo: string[];
}

export interface TranslationResult {
	providerId: ProviderId;
	originalText: string;
	translatedText: string;
	pronunciation?: string;
	/** Source language: the detected one when the request used auto-detect. */
	from: string;
	/** Whether `from` was detected by the provider. */
	detected: boolean;
	to: string;
}

export type TargetOutcome =
	| { to: string; result: TranslationResult; error?: undefined }
	| { to: string; error: TranslateError; result?: undefined };

export interface TranslateContext {
	provider: TranslationProvider;
	settings: ProviderSettings;
	signal?: AbortSignal;
}

const CACHE_LIMIT = 200;
const cache = new Map<string, TranslationResult>();

function remember(key: string, result: TranslationResult) {
	cache.delete(key);
	cache.set(key, result);
	if (cache.size > CACHE_LIMIT) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
}

export function clearTranslationCache() {
	cache.clear();
}

/** Error for a language the provider cannot translate from or to, if any. */
export function unsupportedLanguageError(
	provider: TranslationProvider,
	from: string,
	to: string,
): TranslateError | undefined {
	if (from !== AUTO_DETECT && !provider.resolve(from, "source")) {
		return new TranslateError(
			`${provider.name} can't translate from ${languageName(from)}`,
			"Choose another source language or switch the provider",
			"unsupported",
		);
	}
	if (!provider.resolve(to, "target")) {
		return new TranslateError(
			`${provider.name} can't translate to ${languageName(to)}`,
			"Choose another target language or switch the provider",
			"unsupported",
		);
	}
	return undefined;
}

export async function translateText(
	context: TranslateContext,
	text: string,
	from: string,
	to: string,
): Promise<TranslationResult> {
	const { provider, settings } = context;
	const configError = provider.configurationError(settings);
	if (configError) {
		throw new TranslateError(
			`${provider.name} is not set up`,
			configError,
			"config",
		);
	}
	const unsupported = unsupportedLanguageError(provider, from, to);
	if (unsupported) throw unsupported;
	if (provider.maxTextLength && text.length > provider.maxTextLength) {
		throw new TranslateError(
			"Text is too long",
			`${provider.name} translates up to ${provider.maxTextLength} characters at once`,
		);
	}

	const base = {
		providerId: provider.id,
		originalText: text,
		to,
	};
	if (
		from !== AUTO_DETECT &&
		normalizeLanguage(from) === normalizeLanguage(to)
	) {
		return { ...base, translatedText: text, from, detected: false };
	}

	const formality = provider.supportsFormality
		? (settings.formality ?? "")
		: "";
	const key = [provider.id, from, to, formality, text].join("\u0000");
	const cached = cache.get(key);
	if (cached) return cached;

	const translation = await provider.translate(
		{ text, from, to, signal: context.signal },
		settings,
	);
	const detected = from === AUTO_DETECT && Boolean(translation.detectedFrom);
	const result: TranslationResult = {
		...base,
		translatedText: translation.translatedText,
		pronunciation: translation.pronunciation || undefined,
		from: detected ? (translation.detectedFrom as string) : from,
		detected,
	};
	remember(key, result);
	return result;
}

function targetsOf(set: LanguageSet): string[] {
	const targets = [
		...new Set(set.langTo.filter((code) => code && code !== AUTO_DETECT)),
	];
	if (targets.length === 0) {
		throw new TranslateError(
			"No target language",
			"Choose at least one language to translate to",
			"config",
		);
	}
	return targets;
}

/**
 * Translates to the first target language, or to the second one when the text
 * is already in the first (e.g. English text with English -> Russian).
 */
export async function smartTranslate(
	context: TranslateContext,
	text: string,
	set: LanguageSet,
): Promise<TranslationResult> {
	const targets = targetsOf(set);
	let to = targets[0];
	if (
		set.langFrom !== AUTO_DETECT &&
		isSameLanguage(set.langFrom, to) &&
		targets[1]
	) {
		to = targets[1];
	}
	const result = await translateText(context, text, set.langFrom, to);
	if (
		set.langFrom === AUTO_DETECT &&
		targets[1] &&
		isSameLanguage(result.from, to)
	) {
		const retry = await translateText(context, text, result.from, targets[1]);
		return { ...retry, from: result.from, detected: result.detected };
	}
	return result;
}

/** Errors that affect every target, so they are shown once instead of per language. */
function isGlobalError(error: TranslateError) {
	return error.kind === "config" || error.kind === "network";
}

/** Translates into every target language of the set. */
export async function multiTranslate(
	context: TranslateContext,
	text: string,
	set: LanguageSet,
	prioritizeCrossLanguage = false,
): Promise<TargetOutcome[]> {
	const targets = targetsOf(set);
	const outcomes = await Promise.all(
		targets.map(async (to): Promise<TargetOutcome> => {
			try {
				return {
					to,
					result: await translateText(context, text, set.langFrom, to),
				};
			} catch (error) {
				if (isAbortError(error)) throw error;
				const translateError = toTranslateError(error);
				if (isGlobalError(translateError)) throw translateError;
				return { to, error: translateError };
			}
		}),
	);
	if (!prioritizeCrossLanguage) return outcomes;
	// Move results that are already in the source language (English -> English) to the end.
	const isSame = (outcome: TargetOutcome) =>
		outcome.result
			? isSameLanguage(outcome.result.from, outcome.result.to)
			: false;
	return [...outcomes].sort((a, b) => Number(isSame(a)) - Number(isSame(b)));
}

async function optional(
	promise: Promise<TranslationResult>,
): Promise<TranslationResult | undefined> {
	try {
		return await promise;
	} catch (error) {
		if (isAbortError(error)) throw error;
		const translateError = toTranslateError(error);
		if (translateError.kind === "unsupported") return undefined;
		throw translateError;
	}
}

/**
 * For a set with one target: the translation and the opposite direction, so the
 * user can type in either language. With auto-detect the opposite direction is
 * the translation translated back.
 */
export async function doubleWayTranslate(
	context: TranslateContext,
	text: string,
	set: LanguageSet,
): Promise<TranslationResult[]> {
	if (set.langFrom === AUTO_DETECT) {
		const first = await smartTranslate(context, text, set);
		if (first.from === AUTO_DETECT) return [first];
		const back = await optional(
			translateText(context, first.translatedText, first.to, first.from),
		);
		return back ? [first, back] : [first];
	}
	const targets = targetsOf(set);
	let to = targets[0];
	if (isSameLanguage(set.langFrom, to) && targets[1]) to = targets[1];
	const [forward, reverse] = await Promise.all([
		translateText(context, text, set.langFrom, to),
		optional(translateText(context, text, to, set.langFrom)),
	]);
	return reverse ? [forward, reverse] : [forward];
}
