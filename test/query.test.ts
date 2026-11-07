import assert from "node:assert/strict";
import { test } from "node:test";
import { manualQuery } from "../src/lib/query";

test("manual mode waits for the first submit", () => {
	assert.deepEqual(manualQuery("hello", "google:en", undefined), {
		query: "",
		pending: true,
	});
});

test("manual mode translates the submitted text", () => {
	const submitted = { text: "hello", key: "google:en" };
	assert.deepEqual(manualQuery(" hello ", "google:en", submitted), {
		query: "hello",
		pending: false,
	});
});

test("manual mode waits again after the text changes", () => {
	const submitted = { text: "hello", key: "google:en" };
	assert.deepEqual(manualQuery("hello world", "google:en", submitted), {
		query: "",
		pending: true,
	});
});

test("manual mode waits again after the provider or languages change", () => {
	const submitted = { text: "hello", key: "google:en" };
	assert.deepEqual(manualQuery("hello", "deepl:en", submitted), {
		query: "",
		pending: true,
	});
});

test("manual mode has nothing pending for empty text", () => {
	assert.deepEqual(manualQuery("   ", "google:en", undefined), {
		query: "",
		pending: false,
	});
});
