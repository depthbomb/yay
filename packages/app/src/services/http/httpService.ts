import { HttpClient } from './httpClient';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import type { CreateHttpClientOptions } from './types';

@injectable()
export class HttpService {
	private readonly clients: Map<string, HttpClient>;

	public constructor(
		private readonly logger = inject(LoggingService),
	) {
		this.clients = new Map();
	}

	public getClient(name: string, options: CreateHttpClientOptions) {
		if (this.clients.has(name)) {
			return this.clients.get(name)!;
		}

		const { baseUrl, userAgent, retry } = options;
		const client                        = new HttpClient({ name, baseUrl, userAgent, retry }, this.logger);

		this.clients.set(name, client);

		this.logger.debug('Created HTTP client', { name, ...options });

		return client;
	}
}
