import { type ChildProcess, spawn } from "node:child_process";
import { accessSync, constants, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { googleLanguages } from "../providers/google";
import { TranslateError } from "./errors";
import { httpRequest } from "./http";
import { baseLanguage } from "./languages";

/** Google's text-to-speech endpoint reads at most 200 characters per request. */
const MAX_CHUNK_LENGTH = 200;

const PLAYERS: [string, string[]][] = [
	["mpv", ["--no-video", "--really-quiet"]],
	["ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet"]],
	["mpg123", ["-q"]],
	["pw-play", []],
	["cvlc", ["--play-and-exit", "--intf", "dummy"]],
	["afplay", []],
];

export function splitForSpeech(text: string, max = MAX_CHUNK_LENGTH): string[] {
	const chunks: string[] = [];
	let rest = text.replace(/\s+/g, " ").trim();
	while (rest.length > max) {
		const window = rest.slice(0, max + 1);
		let cut = Math.max(
			...[". ", "! ", "? ", "; ", ", ", "。", "，"].map((mark) =>
				window.lastIndexOf(mark),
			),
		);
		if (cut > 0) cut += 1;
		else cut = window.lastIndexOf(" ");
		if (cut <= 0) cut = max;
		chunks.push(rest.slice(0, cut).trim());
		rest = rest.slice(cut).trim();
	}
	if (rest) chunks.push(rest);
	return chunks;
}

export function speechUrl(
	chunk: string,
	language: string,
	index: number,
	total: number,
) {
	const params = new URLSearchParams({
		ie: "UTF-8",
		q: chunk,
		tl: language,
		total: String(total),
		idx: String(index),
		textlen: String(chunk.length),
		client: "tw-ob",
		prev: "input",
		ttsspeed: "1",
	});
	return `https://translate.google.com/translate_tts?${params}`;
}

function findExecutable(name: string): string | undefined {
	for (const dir of (process.env.PATH ?? "").split(delimiter)) {
		if (!dir) continue;
		const candidate = join(dir, name);
		try {
			accessSync(candidate, constants.X_OK);
			return candidate;
		} catch {
			// not in this directory
		}
	}
	return undefined;
}

/** Splits a command line into words, keeping quoted parts together. */
export function splitCommand(command: string): string[] {
	const words: string[] = [];
	for (const match of command.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)) {
		words.push(match[1] ?? match[2] ?? match[3]);
	}
	return words;
}

/** The player command for a file: the custom one ("{file}" is replaced) or the first one installed. */
export function playerCommand(
	file: string,
	custom?: string,
): string[] | undefined {
	if (custom?.trim()) {
		const words = splitCommand(custom.trim());
		return words.includes("{file}")
			? words.map((word) => (word === "{file}" ? file : word))
			: [...words, file];
	}
	for (const [name, args] of PLAYERS) {
		const executable = findExecutable(name);
		if (executable) return [executable, ...args, file];
	}
	return undefined;
}

let current: ChildProcess | undefined;

export function stopSpeaking() {
	if (current && current.exitCode === null) current.kill();
	current = undefined;
}

export interface SpeakOptions {
	proxy?: string;
	player?: string;
}

/** Reads the text aloud with Google's voice for the language. */
export async function speak(
	text: string,
	language: string,
	options: SpeakOptions = {},
) {
	const chunks = splitForSpeech(text);
	if (chunks.length === 0) return;
	const voice =
		googleLanguages.resolve(language, "target") ?? baseLanguage(language);

	const parts: Buffer[] = [];
	for (const [index, chunk] of chunks.entries()) {
		const response = await httpRequest(
			speechUrl(chunk, voice, index, chunks.length),
			{
				proxy: options.proxy,
			},
		);
		if (response.status !== 200) {
			throw new TranslateError(
				"Text-to-speech failed",
				response.status === 400 || response.status === 404
					? "Google has no voice for this language"
					: `Google answered with HTTP ${response.status}`,
			);
		}
		parts.push(response.body);
	}

	const file = join(
		tmpdir(),
		`translate-this-${process.pid}-${Date.now()}.mp3`,
	);
	writeFileSync(file, Buffer.concat(parts));
	const removeFile = () => {
		try {
			unlinkSync(file);
		} catch {
			// already removed
		}
	};

	const command = playerCommand(file, options.player);
	if (!command) {
		removeFile();
		throw new TranslateError(
			"No audio player found",
			"Install mpv, ffmpeg (ffplay) or mpg123, or set the Text-to-Speech Player preference",
			"config",
		);
	}

	stopSpeaking();
	const child = spawn(command[0], command.slice(1), {
		stdio: "ignore",
		detached: true,
	});
	await new Promise<void>((resolve, reject) => {
		child.once("spawn", resolve);
		child.once("error", (error) => {
			removeFile();
			reject(
				new TranslateError(
					`Could not start ${command[0]}`,
					error.message,
					"config",
				),
			);
		});
	});
	child.once("exit", removeFile);
	child.unref();
	current = child;
}
