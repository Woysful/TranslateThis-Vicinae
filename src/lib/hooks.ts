import {
	type DependencyList,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { isAbortError, type TranslateError, toTranslateError } from "./errors";
import { getSettings } from "./preferences";
import { manualQuery, type SubmittedQuery } from "./query";
import { readClipboardText } from "./text-source";

/** Pause between keystrokes before translating. Pastes skip it. */
export const TRANSLATE_DEBOUNCE_MS = 250;

/** The input text, filled from the clipboard when Autofill | Translate/Translate List is on. */
export function useTextState(initialText?: string) {
	const [text, setText] = useState(initialText ?? "");
	const textRef = useRef(text);
	textRef.current = text;

	useEffect(() => {
		if (initialText || !getSettings().autoInput) return;
		let cancelled = false;
		readClipboardText().then((value) => {
			if (!cancelled && !textRef.current && value.trim()) setText(value);
		});
		return () => {
			cancelled = true;
		};
	}, [initialText]);

	return [text, setText] as const;
}

function isSingleCharacterEdit(previous: string, next: string) {
	const before = Array.from(previous);
	const after = Array.from(next);
	if (Math.abs(before.length - after.length) !== 1) return false;
	const [shorter, longer] =
		before.length < after.length ? [before, after] : [after, before];
	let i = 0;
	let j = 0;
	let skipped = 0;
	while (i < shorter.length && j < longer.length) {
		if (shorter[i] === longer[j]) {
			i += 1;
			j += 1;
		} else {
			skipped += 1;
			if (skipped > 1) return false;
			j += 1;
		}
	}
	return true;
}

export function useDebouncedValue(value: string, delay: number) {
	const [debounced, setDebounced] = useState(value);
	const previous = useRef(value);

	useEffect(() => {
		const before = previous.current;
		previous.current = value;
		// Keep the pause for typing. A paste, a cleared field or autofilled text
		// is not a one-character edit, so it is translated immediately.
		if (!isSingleCharacterEdit(before, value)) {
			setDebounced(value);
			return;
		}
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}

export interface TranslationQuery {
	/** Text to translate now, or "" when nothing should be translated. */
	query: string;
	/** Manual mode only: text that waits for the Translate action. */
	pending: boolean;
	/** Whether text is translated while typing (Translate as You Type). */
	auto: boolean;
	submit: () => void;
}

/**
 * The text to translate: the debounced input while typing when Translate as
 * You Type is on, otherwise the input submitted with the Translate action.
 * `key` identifies the provider and languages, so changing them in manual mode
 * also waits for the next submit.
 */
export function useTranslationQuery(
	text: string,
	key: string,
): TranslationQuery {
	const auto = getSettings().translateOnType;
	const debounced = useDebouncedValue(text, TRANSLATE_DEBOUNCE_MS).trim();
	const [submitted, setSubmitted] = useState<SubmittedQuery>();
	const submit = useCallback(
		() => setSubmitted({ text: text.trim(), key }),
		[text, key],
	);
	if (auto) return { query: debounced, pending: false, auto, submit };
	return { ...manualQuery(text, key, submitted), auto, submit };
}

export interface AsyncState<T> {
	data?: T;
	error?: TranslateError;
	isLoading: boolean;
}

/**
 * Runs an async function whenever the dependencies change. Earlier runs are
 * aborted, and the previous data is kept while the next run is loading.
 */
export function useAsync<T>(
	run: (signal: AbortSignal) => Promise<T>,
	deps: DependencyList,
): AsyncState<T> {
	const [state, setState] = useState<AsyncState<T>>({ isLoading: true });

	useEffect(() => {
		const controller = new AbortController();
		setState((previous) => ({ data: previous.data, isLoading: true }));
		run(controller.signal).then(
			(data) => {
				if (!controller.signal.aborted) setState({ data, isLoading: false });
			},
			(error) => {
				if (controller.signal.aborted || isAbortError(error)) return;
				setState({ error: toTranslateError(error), isLoading: false });
			},
		);
		return () => controller.abort();
	}, deps);

	return state;
}
