import { TranslateError } from "../lib/errors";
import { httpRequest } from "../lib/http";
import { AUTO_DETECT, GOOGLE_LANGUAGES } from "../lib/languages";
import { LanguageMap } from "./language-map";
import type { ProviderTranslation, TranslationProvider } from "./types";

export const googleLanguages = new LanguageMap(
	Object.keys(GOOGLE_LANGUAGES).map((code) => ({
		code,
		source: code,
		target: code,
	})),
);

const ENDPOINT = "https://translate.google.com/translate_a/single";
const MAX_GET_URL_LENGTH = 2048;

export interface GoogleRequest {
	url: string;
	method: "GET" | "POST";
	body?: string;
	headers?: Record<string, string>;
}

/** Same request the Google Translate browser extension sends (client=dict-chrome-ex). */
export function buildGoogleRequest(
	text: string,
	from: string,
	to: string,
): GoogleRequest {
	const params = new URLSearchParams({
		client: "dict-chrome-ex",
		sl: from,
		tl: to,
		hl: to,
		ie: "UTF-8",
		oe: "UTF-8",
		otf: "1",
		ssel: "0",
		tsel: "0",
		kc: "7",
	});
	for (const dt of [
		"at",
		"bd",
		"ex",
		"ld",
		"md",
		"qca",
		"rw",
		"rm",
		"ss",
		"t",
	]) {
		params.append("dt", dt);
	}
	const withText = new URLSearchParams(params);
	withText.set("q", text);
	const url = `${ENDPOINT}?${withText}`;
	if (url.length <= MAX_GET_URL_LENGTH) return { url, method: "GET" };
	return {
		url: `${ENDPOINT}?${params}`,
		method: "POST",
		body: new URLSearchParams({ q: text }).toString(),
		headers: {
			"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
		},
	};
}

export function parseGoogleResponse(body: unknown): ProviderTranslation {
	if (!Array.isArray(body) || !Array.isArray(body[0])) {
		throw new TranslateError(
			"Unexpected answer from Google Translate",
			"The response did not contain a translation",
		);
	}
	let translatedText = "";
	let pronunciation: string | undefined;
	for (const row of body[0] as unknown[]) {
		if (!Array.isArray(row)) continue;
		if (typeof row[0] === "string") {
			translatedText += row[0];
		} else if (row[0] == null) {
			// Romanization row: [null, null, target romanization, source romanization]
			const value = row[2] || row[3];
			if (typeof value === "string" && value) pronunciation = value;
		}
	}
	const detected =
		Array.isArray(body[8]) &&
		Array.isArray(body[8][0]) &&
		typeof body[8][0][0] === "string"
			? body[8][0][0]
			: typeof body[2] === "string"
				? body[2]
				: undefined;
	return {
		translatedText,
		pronunciation,
		detectedFrom: detected ? googleLanguages.toShared(detected) : undefined,
	};
}

export const google: TranslationProvider = {
	id: "google",
	name: "Google Translate",
	website: "https://translate.google.com",
	maxTextLength: 5000,

	configurationError: () => undefined,
	languages: (role) => googleLanguages.codes(role),
	resolve: (code, role) => googleLanguages.resolve(code, role),

	async translate(request, settings) {
		const from =
			request.from === AUTO_DETECT
				? AUTO_DETECT
				: (googleLanguages.resolve(request.from, "source") ?? request.from);
		const to = googleLanguages.resolve(request.to, "target") ?? request.to;
		const { url, method, body, headers } = buildGoogleRequest(
			request.text,
			from,
			to,
		);
		const response = await httpRequest(url, {
			method,
			body,
			headers,
			signal: request.signal,
			proxy: settings.proxy,
		});
		if (response.status === 429) {
			throw new TranslateError(
				"Too many requests",
				"Google Translate is limiting requests, try again later",
			);
		}
		if (response.status !== 200) {
			throw new TranslateError(
				"Google Translate failed",
				`The server answered with HTTP ${response.status}`,
			);
		}
		let json: unknown;
		try {
			json = response.json();
		} catch {
			throw new TranslateError(
				"Unexpected answer from Google Translate",
				"The response is not valid JSON",
			);
		}
		return parseGoogleResponse(json);
	},

	webUrl(text, from, to) {
		const sl =
			from === AUTO_DETECT
				? AUTO_DETECT
				: (this.resolve(from, "source") ?? from);
		const tl = this.resolve(to, "target") ?? to;
		const params = new URLSearchParams({ sl, tl, text, op: "translate" });
		return `https://translate.google.com/?${params}`;
	},
};
