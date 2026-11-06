import { TranslateError } from "./errors";

export interface HttpOptions {
	method?: "GET" | "POST";
	headers?: Record<string, string>;
	body?: string;
	signal?: AbortSignal;
	/** HTTP(S) proxy URL, e.g. http://proxy.example.com:8080 */
	proxy?: string;
	timeoutMs?: number;
}

export interface HttpResponse {
	status: number;
	body: Buffer;
	text(): string;
	json<T = unknown>(): T;
}

const DEFAULT_TIMEOUT_MS = 15_000;

type ProxyAgent = import("undici").ProxyAgent;
const proxyAgents = new Map<string, ProxyAgent>();

async function fetchThroughProxy(
	url: string,
	init: RequestInit,
	proxy: string,
): Promise<{ status: number; body: ArrayBuffer }> {
	// undici is only loaded when a proxy is set, the common path uses the global fetch.
	const undici = await import("undici");
	let agent = proxyAgents.get(proxy);
	if (!agent) {
		agent = new undici.ProxyAgent(proxy);
		proxyAgents.set(proxy, agent);
	}
	const response = await undici.fetch(url, {
		method: init.method,
		headers: init.headers as Record<string, string> | undefined,
		body: init.body as string | undefined,
		signal: init.signal,
		dispatcher: agent,
	});
	return { status: response.status, body: await response.arrayBuffer() };
}

function describeNetworkError(error: unknown): string {
	if (!(error instanceof Error)) return String(error);
	const cause = (
		error as Error & { cause?: { code?: string; message?: string } }
	).cause;
	if (cause?.code) return `${cause.code}: ${cause.message ?? error.message}`;
	return cause?.message ?? error.message;
}

export async function httpRequest(
	url: string,
	options: HttpOptions = {},
): Promise<HttpResponse> {
	const controller = new AbortController();
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, timeoutMs);
	const forwardAbort = () => controller.abort();
	if (options.signal?.aborted) controller.abort();
	options.signal?.addEventListener("abort", forwardAbort, { once: true });

	const init: RequestInit = {
		method: options.method ?? "GET",
		headers: options.headers,
		body: options.body,
		signal: controller.signal,
	};

	try {
		let status: number;
		let raw: ArrayBuffer;
		if (options.proxy) {
			({ status, body: raw } = await fetchThroughProxy(
				url,
				init,
				options.proxy,
			));
		} else {
			const response = await fetch(url, init);
			status = response.status;
			raw = await response.arrayBuffer();
		}
		const body = Buffer.from(raw);
		return {
			status,
			body,
			text: () => body.toString("utf8"),
			json: <T>() => JSON.parse(body.toString("utf8")) as T,
		};
	} catch (error) {
		if (options.signal?.aborted) {
			const abort = new Error("The request was cancelled");
			abort.name = "AbortError";
			throw abort;
		}
		const host = new URL(url).host;
		if (timedOut) {
			throw new TranslateError(
				"Request timed out",
				`${host} did not answer within ${Math.round(timeoutMs / 1000)} seconds`,
				"network",
			);
		}
		throw new TranslateError(
			"Network error",
			`Could not reach ${host} (${describeNetworkError(error)})`,
			"network",
		);
	} finally {
		clearTimeout(timer);
		options.signal?.removeEventListener("abort", forwardAbort);
	}
}
