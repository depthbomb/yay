import { Readable } from 'node:stream';
import EventEmitter from 'node:events';
import { IDGenerator } from '~/common';
import { finished } from 'node:stream/promises';
import { URLPath } from '@depthbomb/common/urllib';
import { retry, ConstantBackoff, handleResultType } from 'cockatiel';
import type { RetryPolicy } from 'cockatiel';
import type { URLLike } from '@depthbomb/common/urllib';
import type { Path } from '@depthbomb/node-common/pathlib';
import type { GETOptions, RequestOptions, HTTPClientEvents, HTTPClientOptions, DownloadOptions } from './types';

export class HTTPClient extends EventEmitter<HTTPClientEvents> {
	public readonly name: string;
	private readonly baseURL?: string;
	private readonly userAgent: string;
	private readonly retry: boolean;
	private readonly retryPolicy: RetryPolicy;
	private readonly idGenerator: IDGenerator;

	public constructor(options: HTTPClientOptions) {
		super();
		this.name        = options.name;
		this.baseURL     = options?.baseURL;
		this.userAgent   = options.userAgent;
		this.retry       = !!options?.retry;
		this.retryPolicy = retry(handleResultType(Response, res => res.status >= 500 || res.status === 429), {
			maxAttempts: 5,
			backoff: new ConstantBackoff(1_500)
		});
		this.idGenerator = new IDGenerator(`${this.name}#`);
	}

	public async get(url: string | URL, options?: GETOptions) {
		return this._doRequest(url, { method: 'GET', ...options });
	}

	public async send(url: string | URL, options?: RequestOptions) {
		return this._doRequest(url, options);
	}

	private async _doRequest(input: URLLike, options: RequestOptions = {}) {
		const requestInit = {
			method: 'GET',
			...options,
			headers: {
				'user-agent': this.userAgent,
				'accept': 'application/json',
				...options.headers
			},
		} as RequestInit;

		let requestURL: URLPath;
		if (this.baseURL) {
			requestURL = URLPath.from(input, this.baseURL);
		} else {
			requestURL = URLPath.from(input);
		}

		if (options.query) {
			requestURL = requestURL.withQuery(options.query);
		}

		const requestID = this.idGenerator.nextID();

		this.emit('request', requestID, requestURL, requestInit, this.retry);

		// this.logger.debug('Making HTTP request', { requestID, method: options?.method, requestURL, retry: this.retry });

		let res: Response;
		if (this.retry) {
			res = await this.retryPolicy.execute(() => requestURL.fetch(requestInit));
		} else {
			res = await requestURL.fetch(requestInit);
		}

		this.emit('response', requestID, requestURL, res);

		// this.logger.debug('Finished HTTP request', {
		// 	requestID,
		// 	status: `${res.status} - ${res.statusText}`
		// });

		return res;
	}

	public async downloadWithProgress(res: Response, outputPath: Path, options: DownloadOptions) {
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}

		const contentLength = Number(res.headers.get('content-length') ?? 0);
		const nodeStream    = Readable.fromWeb(res.body!);
		const file          = outputPath.toWriteStream();

		let downloadedBytes = 0;

		nodeStream.on('data', (chunk: Buffer) => {
			downloadedBytes += chunk.length;
			if (contentLength && options.onProgress) {
				options.onProgress(Math.round((downloadedBytes / contentLength) * 100));
			}
		});

		return finished(nodeStream.pipe(file), { signal: options.signal });
	}
}
