import { TranslateError } from "../lib/errors";
import { httpRequest } from "../lib/http";
import { AUTO_DETECT } from "../lib/languages";
import { type LanguageEntry, LanguageMap } from "./language-map";
import type { ProviderSettings, TranslationProvider } from "./types";

// Languages whose DeepL code is the shared code in upper case.
const SAME_CODE = [
	"ace",
	"af",
	"sq",
	"ar",
	"an",
	"hy",
	"as",
	"ay",
	"az",
	"ba",
	"eu",
	"be",
	"bn",
	"bho",
	"bs",
	"br",
	"bg",
	"my",
	"yue",
	"ca",
	"ceb",
	"hr",
	"cs",
	"da",
	"nl",
	"eo",
	"et",
	"fi",
	"gl",
	"ka",
	"el",
	"gn",
	"gu",
	"ht",
	"ha",
	"hi",
	"hu",
	"is",
	"ig",
	"id",
	"ga",
	"it",
	"ja",
	"jv",
	"pam",
	"kk",
	"gom",
	"ko",
	"ckb",
	"ky",
	"la",
	"lv",
	"ln",
	"lt",
	"lmo",
	"lb",
	"mk",
	"mai",
	"mg",
	"ms",
	"ml",
	"mt",
	"mi",
	"mr",
	"mn",
	"ne",
	"oc",
	"om",
	"pag",
	"ps",
	"fa",
	"pl",
	"pa",
	"qu",
	"ro",
	"ru",
	"sa",
	"sr",
	"st",
	"scn",
	"sk",
	"sl",
	"su",
	"sw",
	"sv",
	"tl",
	"tg",
	"ta",
	"tt",
	"te",
	"th",
	"ts",
	"tn",
	"tr",
	"tk",
	"uk",
	"ur",
	"uz",
	"vi",
	"cy",
	"wo",
	"xh",
	"yi",
	"zu",
];

// https://developers.deepl.com/docs/getting-started/supported-languages
// Main languages come before their variants so detected codes map back to them.
const ENTRIES: LanguageEntry[] = [
	{ code: "en", source: "EN", target: "EN-US" },
	{ code: "en-US", source: "EN", target: "EN-US" },
	{ code: "en-GB", source: "EN", target: "EN-GB" },
	{ code: "pt", source: "PT", target: "PT-BR" },
	{ code: "pt-PT", source: "PT", target: "PT-PT" },
	{ code: "zh-CN", source: "ZH", target: "ZH-HANS" },
	{ code: "zh-TW", source: "ZH", target: "ZH-HANT" },
	{ code: "fr", source: "FR", target: "FR" },
	{ code: "fr-CA", source: "FR", target: "FR-CA" },
	{ code: "de", source: "DE", target: "DE" },
	{ code: "de-CH", source: "DE", target: "DE-CH" },
	{ code: "es", source: "ES", target: "ES" },
	{ code: "es-419", source: "ES", target: "ES-419" },
	{ code: "iw", source: "HE", target: "HE" },
	{ code: "no", source: "NB", target: "NB" },
	{ code: "fa-AF", source: "PRS", target: "PRS" },
	{ code: "ku", source: "KMR", target: "KMR" },
	...SAME_CODE.map((code) => ({
		code,
		source: code.toUpperCase(),
		target: code.toUpperCase(),
	})),
];

export const deeplLanguages = new LanguageMap(ENTRIES);

const QUOTA_EXCEEDED = 456;

/** Free API keys end with ":fx" and use a different host. */
export function deeplEndpoint(apiKey: string): string {
	return apiKey.trim().endsWith(":fx")
		? "https://api-free.deepl.com"
		: "https://api.deepl.com";
}

export function deeplError(status: number, body: string): TranslateError {
	let message = "";
	try {
		message = (JSON.parse(body) as { message?: string }).message ?? "";
	} catch {
		message = body.trim().slice(0, 200);
	}
	if (status === 401 || status === 403) {
		return new TranslateError(
			"Invalid DeepL API key",
			"Check the DeepL API key in the extension preferences",
			"config",
		);
	}
	if (status === QUOTA_EXCEEDED) {
		return new TranslateError(
			"DeepL quota exceeded",
			"The character limit of your DeepL plan has been reached",
		);
	}
	if (status === 429) {
		return new TranslateError(
			"Too many requests",
			"DeepL is limiting requests, wait a moment and try again",
		);
	}
	if (status === 413) {
		return new TranslateError(
			"Text is too long",
			"DeepL rejected the request size",
		);
	}
	if (status >= 500) {
		return new TranslateError(
			"DeepL is unavailable",
			`The server answered with HTTP ${status}, try again later`,
			"network",
		);
	}
	return new TranslateError(
		"DeepL rejected the request",
		message || `The server answered with HTTP ${status}`,
	);
}

function apiKey(settings: ProviderSettings): string {
	return settings.apiKeys.deepl?.trim() ?? "";
}

interface DeepLTranslateResponse {
	translations?: { text: string; detected_source_language?: string }[];
}

export const deepl: TranslationProvider = {
	id: "deepl",
	name: "DeepL",
	website: "https://www.deepl.com/translator",
	apiKeyUrl: "https://www.deepl.com/your-account/keys",
	supportsFormality: true,

	configurationError(settings) {
		return apiKey(settings)
			? undefined
			: "Add your DeepL API key in the extension preferences. A free key is available at deepl.com/pro-api";
	},
	languages: (role) => deeplLanguages.codes(role),
	resolve: (code, role) => deeplLanguages.resolve(code, role),

	async translate(request, settings) {
		const key = apiKey(settings);
		const payload: Record<string, unknown> = {
			text: [request.text],
			target_lang: deeplLanguages.resolve(request.to, "target") ?? request.to,
		};
		if (request.from !== AUTO_DETECT) {
			payload.source_lang =
				deeplLanguages.resolve(request.from, "source") ?? request.from;
		}
		if (settings.formality && settings.formality !== "default") {
			// The prefer_* values fall back silently for languages without formality.
			payload.formality = settings.formality;
		}
		const response = await httpRequest(`${deeplEndpoint(key)}/v2/translate`, {
			method: "POST",
			headers: {
				Authorization: `DeepL-Auth-Key ${key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			signal: request.signal,
			proxy: settings.proxy,
		});
		if (response.status !== 200)
			throw deeplError(response.status, response.text());
		const translation =
			response.json<DeepLTranslateResponse>().translations?.[0];
		if (!translation) {
			throw new TranslateError(
				"Unexpected answer from DeepL",
				"The response did not contain a translation",
			);
		}
		return {
			translatedText: translation.text,
			detectedFrom: translation.detected_source_language
				? deeplLanguages.toShared(translation.detected_source_language)
				: undefined,
		};
	},

	webUrl(text, from, to) {
		const source =
			from === AUTO_DETECT
				? AUTO_DETECT
				: (deeplLanguages.resolve(from, "source") ?? from).toLowerCase();
		const target = (deeplLanguages.resolve(to, "target") ?? to).toLowerCase();
		// The DeepL web app separates fields with "/", so slashes in the text are escaped.
		const encoded = encodeURIComponent(text.replaceAll("/", "\\/"));
		return `https://www.deepl.com/translator#${source}/${target}/${encoded}`;
	},

	async getUsage(settings, signal) {
		const key = apiKey(settings);
		if (!key)
			throw new TranslateError(
				"DeepL is not configured",
				this.configurationError(settings),
				"config",
			);
		const response = await httpRequest(`${deeplEndpoint(key)}/v2/usage`, {
			headers: { Authorization: `DeepL-Auth-Key ${key}` },
			signal,
			proxy: settings.proxy,
		});
		if (response.status !== 200)
			throw deeplError(response.status, response.text());
		const usage = response.json<{
			character_count?: number;
			character_limit?: number;
		}>();
		return {
			used: usage.character_count ?? 0,
			limit: usage.character_limit ?? 0,
			unit: "characters",
		};
	},
};
