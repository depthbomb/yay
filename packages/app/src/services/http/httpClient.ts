import { debugLog } from '~/utils';
import { Readable } from 'node:stream';
import { joinURL, withQuery } from 'ufo';
import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { IdGenerator } from '~/common/idGenerator';
import { retry, handleResultType, ConstantBackoff } from 'cockatiel';
import type { RetryPolicy } from 'cockatiel';
import type { GETOptions, RequestOptions, HttpClientOptions, DownloadOptions } from './types';

export class HttpClient {
	private readonly name: string;
	private readonly baseUrl?: string;
	private readonly userAgent: string;
	private readonly retry: boolean;
	private readonly retryPolicy: RetryPolicy;
	private readonly idGenerator: IdGenerator;

	public constructor(options: HttpClientOptions) {
		this.name        = options?.name;
		this.baseUrl     = options?.baseUrl;
		this.userAgent   = options.userAgent;
		this.retry       = !!options?.retry;
		this.retryPolicy = retry(handleResultType(Response, (res) => res.status > 399), {
			maxAttempts: 10,
			backoff: new ConstantBackoff(1_000)
		});
		this.idGenerator = new IdGenerator(`${this.name}#`);
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

		const requestId = this.idGenerator.nextId();

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

	public async downloadWithProgress(res: Response, outputPath: string, options: DownloadOptions) {
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}

		const contentLength = parseInt(res.headers.get('content-length') ?? '0');
		const stream = createWriteStream(outputPath);

		let downloadedBytes = 0;
		const reader = res.body!.getReader();

		if (options.signal.aborted) {
			reader.cancel();
			stream.destroy();
			return;
		}

		const abortHandler = () => {
			reader.cancel();
			stream.destroy();
		};
		options.signal.addEventListener('abort', abortHandler);

		try {
			const readable = new Readable({
				async read() {
					try {
						const { done, value } = await reader.read();
						if (done) {
							this.push(null);
							return;
						}

						downloadedBytes += value.length;
						if (contentLength && options.onProgress) {
							const progress = (downloadedBytes / contentLength) * 100;
							options.onProgress(Math.round(progress));
						}

						this.push(value);
					} catch (err) {
						if (options.signal.aborted) {
							this.push(null);
						} else {
							this.destroy(err as Error);
						}
					}
				}
			});

			await finished(readable.pipe(stream)).catch(err => {
				if (!options.signal.aborted) {
					throw err;
				}
			});
		} finally {
			options.signal.removeEventListener('abort', abortHandler);
		}
	}
}
