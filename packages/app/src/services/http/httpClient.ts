import { Readable } from 'node:stream';
import { IDGenerator } from '~/common';
import { joinURL, withQuery } from 'ufo';
import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { retry, ConstantBackoff, handleResultType } from 'cockatiel';
import type { RetryPolicy } from 'cockatiel';
import type { LoggingService } from '~/services/logging';
import type { GETOptions, RequestOptions, HTTPClientOptions, DownloadOptions } from './types';

export class HTTPClient {
	private readonly name: string;
	private readonly baseURL?: string;
	private readonly userAgent: string;
	private readonly retry: boolean;
	private readonly retryPolicy: RetryPolicy;
	private readonly idGenerator: IDGenerator;
	private readonly logger: LoggingService;

	public constructor(options: HTTPClientOptions, logger: LoggingService) {
		this.name        = options.name;
		this.baseURL     = options?.baseURL;
		this.userAgent   = options.userAgent;
		this.retry       = !!options?.retry;
		this.retryPolicy = retry(handleResultType(Response, res => res.status >= 500 || res.status === 429), {
			maxAttempts: 5,
			backoff: new ConstantBackoff(1_000)
		});
		this.idGenerator = new IDGenerator(`${this.name}#`);
		this.logger      = logger;
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
				'accept': 'application/json',
				...(options?.headers ?? {})
			},
		};

		let requestURL = this.baseURL ? joinURL(this.baseURL, input) : input;

		if (options?.query) {
			requestURL = withQuery(requestURL, options.query);
		}

		const requestID = this.idGenerator.nextID();

		this.logger.debug('Making HTTP request', { requestID, method: options?.method, requestURL, retry: this.retry });

		try {
			let res: Response;
			if (this.retry) {
				res = await this.retryPolicy.execute(() => fetch(requestURL, requestInit));
			} else {
				res = await fetch(requestURL, requestInit);
			}

			this.logger.debug('Finished HTTP request', {
				requestID,
				status: `${res.status} - ${res.statusText}`
			});

			return res;
		} catch (err) {
			this.logger.error('HTTP request failed', { requestID, requestURL, err });
			throw err;
		}
	}

	public async downloadWithProgress(res: Response, outputPath: string, options: DownloadOptions) {
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}

		const contentLength = Number(res.headers.get('content-length') ?? 0);
		const nodeStream    = Readable.fromWeb(res.body!);
		const file          = createWriteStream(outputPath);

		let downloadedBytes = 0;

		nodeStream.on('data', (chunk: Buffer) => {
			downloadedBytes += chunk.length;
			if (contentLength && options.onProgress) {
				options.onProgress(Math.round((downloadedBytes / contentLength) * 100));
			}
		});

		return finished(nodeStream.pipe(file), { signal: options.signal })
	}
}
