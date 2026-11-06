import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { TranslateError } from "../src/lib/errors";
import { deepl, deeplEndpoint } from "../src/providers/deepl";
import { stubFetch } from "./helpers";

let restore = () => {};
afterEach(() => restore());

const freeKey = { apiKeys: { deepl: "abc-123:fx" } };

test("chooses the Free or Pro API host from the key", () => {
	assert.equal(deeplEndpoint("abc:fx"), "https://api-free.deepl.com");
	assert.equal(deeplEndpoint("abc"), "https://api.deepl.com");
});

test("asks for a key when none is set", () => {
	assert.match(deepl.configurationError({ apiKeys: {} }) ?? "", /API key/);
	assert.equal(deepl.configurationError(freeKey), undefined);
});

test("sends DeepL codes, the key and the formality", async () => {
	const stub = stubFetch(() => ({
		body: { translations: [{ detected_source_language: "ZH", text: "Hello" }] },
	}));
	restore = stub.restore;
	const result = await deepl.translate(
		{ text: "你好", from: "auto", to: "en" },
		{ ...freeKey, formality: "prefer_more" },
	);
	const [request] = stub.requests;
	assert.equal(request.url, "https://api-free.deepl.com/v2/translate");
	assert.equal(request.method, "POST");
	assert.equal(request.headers.Authorization, "DeepL-Auth-Key abc-123:fx");
	assert.deepEqual(JSON.parse(request.body ?? ""), {
		text: ["你好"],
		target_lang: "EN-US",
		formality: "prefer_more",
	});
	assert.deepEqual(result, { translatedText: "Hello", detectedFrom: "zh-CN" });
});

test("sends the source language when it is set and omits default formality", async () => {
	const stub = stubFetch(() => ({
		body: { translations: [{ text: "Привіт" }] },
	}));
	restore = stub.restore;
	await deepl.translate(
		{ text: "Hello", from: "en-GB", to: "uk" },
		{ apiKeys: { deepl: "pro-key" }, formality: "default" },
	);
	assert.equal(stub.requests[0].url, "https://api.deepl.com/v2/translate");
	assert.deepEqual(JSON.parse(stub.requests[0].body ?? ""), {
		text: ["Hello"],
		target_lang: "UK",
		source_lang: "EN",
	});
});

for (const [status, title, kind] of [
	[403, "Invalid DeepL API key", "config"],
	[456, "DeepL quota exceeded", "provider"],
	[429, "Too many requests", "provider"],
	[503, "DeepL is unavailable", "network"],
	[400, "DeepL rejected the request", "provider"],
] as const) {
	test(`explains HTTP ${status}`, async () => {
		restore = stubFetch(() => ({
			status,
			body: { message: "Value for 'target_lang' not supported." },
		})).restore;
		await assert.rejects(
			deepl.translate({ text: "Hello", from: "auto", to: "ru" }, freeKey),
			(error: TranslateError) => {
				assert.equal(error.title, title);
				assert.equal(error.kind, kind);
				if (status === 400) assert.match(error.message, /target_lang/);
				return true;
			},
		);
	});
}

test("reads the character usage", async () => {
	const stub = stubFetch(() => ({
		body: { character_count: 1200, character_limit: 500000 },
	}));
	restore = stub.restore;
	assert.deepEqual(await deepl.getUsage?.(freeKey), {
		used: 1200,
		limit: 500000,
		unit: "characters",
	});
	assert.equal(stub.requests[0].url, "https://api-free.deepl.com/v2/usage");
});

test("builds a DeepL website link", () => {
	assert.equal(
		deepl.webUrl?.("a/b c", "auto", "en-GB"),
		"https://www.deepl.com/translator#auto/en-gb/a%5C%2Fb%20c",
	);
});
