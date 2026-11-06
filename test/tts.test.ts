import assert from "node:assert/strict";
import { test } from "node:test";
import {
	playerCommand,
	speechUrl,
	splitCommand,
	splitForSpeech,
} from "../src/lib/tts";

test("splits long text into chunks of at most 200 characters without losing words", () => {
	const text = Array.from(
		{ length: 60 },
		(_, i) => `Sentence number ${i}, with some words.`,
	).join(" ");
	const chunks = splitForSpeech(text);
	assert.ok(chunks.length > 1);
	for (const chunk of chunks) assert.ok(chunk.length <= 200, chunk);
	assert.equal(chunks.join(" "), text);
});

test("splits text without spaces at the limit", () => {
	const chunks = splitForSpeech("字".repeat(450));
	assert.deepEqual(
		chunks.map((chunk) => chunk.length),
		[200, 200, 50],
	);
});

test("builds the speech URL", () => {
	const url = new URL(speechUrl("hello", "en", 0, 1));
	assert.equal(url.searchParams.get("q"), "hello");
	assert.equal(url.searchParams.get("tl"), "en");
	assert.equal(url.searchParams.get("client"), "tw-ob");
});

test("uses a custom player command", () => {
	assert.deepEqual(splitCommand(`mpv --title "My Player" 'a b'`), [
		"mpv",
		"--title",
		"My Player",
		"a b",
	]);
	assert.deepEqual(
		playerCommand("/tmp/x.mp3", "mpv --volume=80 {file} --no-video"),
		["mpv", "--volume=80", "/tmp/x.mp3", "--no-video"],
	);
	assert.deepEqual(playerCommand("/tmp/x.mp3", "paplay"), [
		"paplay",
		"/tmp/x.mp3",
	]);
});
