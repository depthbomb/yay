import { debugLog } from '~/utils';
import { HttpClient } from './httpClient';
import { injectable } from '@needle-di/core';
import type { CreateHttpClientOptions } from './types';

@injectable()
export class HttpService {
	private readonly clients: Map<string, HttpClient>;

	public constructor() {
		this.clients = new Map();
	}

	public getClient(name: string, options: CreateHttpClientOptions) {
		if (this.clients.has(name)) {
			return this.clients.get(name)!;
		}

		const { baseUrl, userAgent, retry } = options;
		const client                        = new HttpClient({ name, baseUrl, userAgent, retry });

		this.clients.set(name, client);

		debugLog('Created HTTP client', { name, ...options });

		return client;
	}
}
