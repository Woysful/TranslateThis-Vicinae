export type ErrorKind =
	/** The provider needs setup, e.g. an API key. */
	| "config"
	/** The provider does not support a language. */
	| "unsupported"
	/** The request did not reach the provider or timed out. */
	| "network"
	/** The provider answered with an error. */
	| "provider";

export class TranslateError extends Error {
	readonly title: string;
	readonly kind: ErrorKind;

	constructor(title: string, message = "", kind: ErrorKind = "provider") {
		super(message || title);
		this.name = "TranslateError";
		this.title = title;
		this.kind = kind;
	}

	/** The message, or an empty string when it only repeats the title. */
	get detail(): string {
		return this.message === this.title ? "" : this.message;
	}
}

export function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}

export function toTranslateError(error: unknown): TranslateError {
	if (error instanceof TranslateError) return error;
	if (error instanceof Error) {
		return new TranslateError("Translation failed", error.message);
	}
	return new TranslateError("Translation failed", String(error));
}
