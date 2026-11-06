import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { TranslateError } from "../src/lib/errors";
import {
	buildGoogleRequest,
	google,
	parseGoogleResponse,
} from "../src/providers/google";
import { stubFetch } from "./helpers";

const settings = { apiKeys: {} };
let restore = () => {};
afterEach(() => restore());

// Shape of a real answer for "Hello world. How are you?" (auto -> ru).
const RESPONSE = [
	[
		["Привет, мир. ", "Hello world. ", null, null, 10],
		["Как вы?", "How are you?", null, null, 10],
		[null, null, "Privet, mir. Kak vy?"],
	],
	null,
	"en",
	null,
	null,
	null,
	null,
	[],
	[["en"], null, [0.98], ["en"]],
];

test("parses the translation, romanization and detected language", () => {
	assert.deepEqual(parseGoogleResponse(RESPONSE), {
		translatedText: "Привет, мир. Как вы?",
		pronunciation: "Privet, mir. Kak vy?",
		detectedFrom: "en",
	});
});

test("rejects an answer without a translation", () => {
	assert.throws(() => parseGoogleResponse({}), TranslateError);
});

test("uses POST for long texts", () => {
	assert.equal(buildGoogleRequest("short", "auto", "ru").method, "GET");
	const long = buildGoogleRequest("word ".repeat(600), "auto", "ru");
	assert.equal(long.method, "POST");
	assert.ok(!long.url.includes("q="));
	assert.ok(long.body?.startsWith("q="));
});

test("translates with Google codes and handles HTTP errors", async () => {
	const stub = stubFetch(() => ({ body: RESPONSE }));
	restore = stub.restore;
	const result = await google.translate(
		{ text: "Hello", from: "auto", to: "en-GB" },
		settings,
	);
	const url = new URL(stub.requests[0].url);
	assert.equal(url.searchParams.get("sl"), "auto");
	assert.equal(url.searchParams.get("tl"), "en");
	assert.equal(result.translatedText, "Привет, мир. Как вы?");
	stub.restore();

	restore = stubFetch(() => ({ status: 429, body: "" })).restore;
	await assert.rejects(
		google.translate({ text: "Hello", from: "en", to: "ru" }, settings),
		(error: TranslateError) => error.title === "Too many requests",
	);
});

test("builds a Google Translate website link", () => {
	const url = new URL(google.webUrl?.("Hi there", "auto", "en-GB") ?? "");
	assert.equal(url.searchParams.get("sl"), "auto");
	assert.equal(url.searchParams.get("tl"), "en");
	assert.equal(url.searchParams.get("text"), "Hi there");
});
