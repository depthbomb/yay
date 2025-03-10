import { debugLog } from '~/utils';
import { joinURL, withQuery } from 'ufo';
import { retry, handleResultType, ConstantBackoff } from 'cockatiel';
import type { RetryPolicy } from 'cockatiel';
import type { GETOptions, RequestOptions, HttpClientOptions } from '.';

export class HttpClient {
	private requestNum = 0;

	private readonly name: string;
	private readonly baseUrl?: string;
	private readonly userAgent: string;
	private readonly retry: boolean;
	private readonly retryPolicy: RetryPolicy;

	public constructor(options: HttpClientOptions) {
		this.name        = options?.name;
		this.baseUrl     = options?.baseUrl;
		this.userAgent   = options.userAgent;
		this.retry       = !!options?.retry;
		this.retryPolicy = retry(handleResultType(Response, (res) => res.status > 399), {
			maxAttempts: 10,
			backoff: new ConstantBackoff(1_000)
		});
	}

	public async get(url: string | URL, options?: GETOptions) {
		return this._doRequest(url, { method: 'GET', ...options });
	}

	public async send(url: string | URL, options?: RequestOptions) {
		return this._doRequest(url, options);
	}

	private async _doRequest(input: string | URL, options?: RequestOptions) {
		if (typeof input !== 'string') {
			input = input.toString();
		}

		const requestInit = {
			...options,
			headers: {
				'user-agent': this.userAgent,
				'accept': 'application/json'
			},
		};

		let requestUrl = this.baseUrl ? joinURL(this.baseUrl, input) : input;

		if (options?.query) {
			requestUrl = withQuery(requestUrl, options.query);
		}

		const requestId = `${this.name}-${++this.requestNum}`;

		debugLog('Making HTTP request', { requestId, method: options?.method, url: requestUrl, retry: this.retry });

		let res: Response;
		if (this.retry) {
			res = await this.retryPolicy.execute(() => fetch(requestUrl, requestInit));
		} else {
			res = await fetch(requestUrl, requestInit);
		}

		debugLog('Finished HTTP request', {
			requestId,
			status: `${res.status} - ${res.statusText}`
		});

		return res;
	}
}
