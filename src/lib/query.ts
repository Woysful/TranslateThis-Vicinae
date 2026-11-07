export interface SubmittedQuery {
	text: string;
	/** Provider and languages the text was submitted with. */
	key: string;
}

export interface ManualQuery {
	/** Text to translate now, or "" when nothing should be translated. */
	query: string;
	/** Whether there is text that has not been translated with the current settings. */
	pending: boolean;
}

/**
 * With Translate as You Type off, only text submitted with the current provider
 * and languages is translated. Any change waits for the next submit, so API
 * characters are spent only on request.
 */
export function manualQuery(
	text: string,
	key: string,
	submitted: SubmittedQuery | undefined,
): ManualQuery {
	const current = text.trim();
	const matches = submitted?.text === current && submitted.key === key;
	return {
		query: matches ? current : "",
		pending: Boolean(current) && !matches,
	};
}
