import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { TranslateError } from "../src/lib/errors";
import {
	clearTranslationCache,
	doubleWayTranslate,
	multiTranslate,
	smartTranslate,
	translateText,
} from "../src/lib/translate";
import type {
	TranslateRequest,
	TranslationProvider,
} from "../src/providers/types";

/** Detects English for latin text and Russian otherwise; "translates" to "[to] text". */
function fakeProvider(
	options: { unsupported?: string[]; needsKey?: boolean } = {},
) {
	const calls: TranslateRequest[] = [];
	const provider: TranslationProvider = {
		id: "google",
		name: "Fake",
		website: "",
		configurationError: (settings) =>
			options.needsKey && !settings.apiKeys.deepl ? "Set a key" : undefined,
		languages: () => [],
		resolve: (code) => (options.unsupported?.includes(code) ? undefined : code),
		async translate(request) {
			calls.push(request);
			const detected = /^[a-z ]+$/i.test(request.text) ? "en" : "ru";
			return {
				translatedText: `[${request.to}] ${request.text}`,
				detectedFrom: request.from === "auto" ? detected : undefined,
			};
		},
	};
	return { provider, calls };
}

const settings = { apiKeys: {} };
beforeEach(() => clearTranslationCache());

test("translates to the secondary language when the text is in the primary one", async () => {
	const { provider, calls } = fakeProvider();
	const context = { provider, settings };
	const set = { langFrom: "auto", langTo: ["en", "ru"] };

	const english = await smartTranslate(context, "hello", set);
	assert.equal(english.to, "ru");
	assert.equal(english.from, "en");
	assert.ok(english.detected);
	assert.equal(calls.length, 2);
	assert.equal(calls[1].from, "en");

	const russian = await smartTranslate(context, "привет", set);
	assert.equal(russian.to, "en");
	assert.equal(russian.translatedText, "[en] привет");
});

test("skips a target equal to a fixed source language", async () => {
	const { provider, calls } = fakeProvider();
	const result = await smartTranslate({ provider, settings }, "hello", {
		langFrom: "en",
		langTo: ["en-GB", "de"],
	});
	assert.equal(result.to, "de");
	assert.equal(calls.length, 1);
});

test("caches translations and returns identical languages as they are", async () => {
	const { provider, calls } = fakeProvider();
	const context = { provider, settings };
	await translateText(context, "hello", "en", "ru");
	await translateText(context, "hello", "en", "ru");
	assert.equal(calls.length, 1);
	const same = await translateText(context, "hello", "en", "en");
	assert.equal(same.translatedText, "hello");
	assert.equal(calls.length, 1);
});

test("reports unsupported languages per target and keeps the others", async () => {
	const { provider } = fakeProvider({ unsupported: ["ab"] });
	const outcomes = await multiTranslate({ provider, settings }, "hello", {
		langFrom: "auto",
		langTo: ["de", "ab", "fr"],
	});
	assert.deepEqual(
		outcomes.map((outcome) => [
			outcome.to,
			outcome.result ? "ok" : outcome.error?.kind,
		]),
		[
			["de", "ok"],
			["ab", "unsupported"],
			["fr", "ok"],
		],
	);
	assert.match(outcomes[1].error?.title ?? "", /can't translate to Abkhaz/);
});

test("throws setup errors once instead of per target", async () => {
	const { provider } = fakeProvider({ needsKey: true });
	await assert.rejects(
		multiTranslate({ provider, settings }, "hello", {
			langFrom: "auto",
			langTo: ["de", "fr"],
		}),
		(error: TranslateError) => error.kind === "config",
	);
});

test("moves same-language results to the end when asked", async () => {
	const { provider } = fakeProvider();
	const set = { langFrom: "auto", langTo: ["en", "de"] };
	const kept = await multiTranslate({ provider, settings }, "hello", set);
	assert.deepEqual(
		kept.map((outcome) => outcome.to),
		["en", "de"],
	);
	const sorted = await multiTranslate(
		{ provider, settings },
		"hello",
		set,
		true,
	);
	assert.deepEqual(
		sorted.map((outcome) => outcome.to),
		["de", "en"],
	);
});

test("double-way translation with auto-detect translates the result back", async () => {
	const { provider } = fakeProvider();
	const [forward, back] = await doubleWayTranslate(
		{ provider, settings },
		"привет",
		{
			langFrom: "auto",
			langTo: ["en"],
		},
	);
	assert.equal(forward.translatedText, "[en] привет");
	assert.equal(back.from, "en");
	assert.equal(back.to, "ru");
});

test("double-way translation with a fixed source shows both directions", async () => {
	const { provider } = fakeProvider();
	const results = await doubleWayTranslate({ provider, settings }, "text", {
		langFrom: "ru",
		langTo: ["en"],
	});
	assert.deepEqual(
		results.map((result) => [result.from, result.to]),
		[
			["ru", "en"],
			["en", "ru"],
		],
	);
});

test("double-way translation reports a source language the provider can't do", async () => {
	const { provider } = fakeProvider({ unsupported: ["ab"] });
	const results = await doubleWayTranslate({ provider, settings }, "text", {
		langFrom: "ab",
		langTo: ["en"],
	}).catch((error) => error);
	assert.ok(results instanceof TranslateError);
	assert.equal(results.kind, "unsupported");
});

test("rejects texts above the provider limit", async () => {
	const { provider } = fakeProvider();
	await assert.rejects(
		translateText(
			{ provider: { ...provider, maxTextLength: 3 }, settings },
			"hello",
			"en",
			"de",
		),
		/up to 3 characters/,
	);
});
