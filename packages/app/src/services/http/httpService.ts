import { HTTPClient } from './httpClient';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { CreateHTTPClientOptions } from './types';

@injectable()
export class HTTPService {
	private readonly clients: Map<string, HTTPClient>;

	public constructor(
		private readonly logger = inject(LoggingService),
	) {
		this.clients = new Map();
	}

	public getClient(name: string, options: CreateHTTPClientOptions) {
		if (this.clients.has(name)) {
			return this.clients.get(name)!;
		}

		const { baseURL, userAgent, retry } = options;
		const client                        = new HTTPClient({ name, baseURL, userAgent, retry }, this.logger);

		this.clients.set(name, client);

		this.logger.debug('Created HTTP client', { name, ...options });

		return client;
	}
}
