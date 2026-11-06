export interface RecordedRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: string;
}

/** Replaces the global fetch with one that records requests and answers with `respond`. */
export function stubFetch(
	respond: (request: RecordedRequest) => { status?: number; body: unknown },
) {
	const requests: RecordedRequest[] = [];
	const original = globalThis.fetch;
	globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
		const request: RecordedRequest = {
			url: String(input),
			method: init?.method ?? "GET",
			headers: (init?.headers ?? {}) as Record<string, string>,
			body: init?.body as string | undefined,
		};
		requests.push(request);
		const { status = 200, body } = respond(request);
		return new Response(
			typeof body === "string" ? body : JSON.stringify(body),
			{ status },
		);
	}) as typeof fetch;
	return {
		requests,
		restore: () => {
			globalThis.fetch = original;
		},
	};
}
