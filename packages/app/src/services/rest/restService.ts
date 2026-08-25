import { Hono } from 'hono';
import { ok } from 'shared/ipc';
import { eventBus } from '~/events';
import { IDGenerator } from '~/common';
import { serve } from '@hono/node-server';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { IPCService } from '~/services/ipc';
import { YtdlpService } from '~/services/ytdlp';
import { isValidURL, ESettingsKey } from 'shared';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import type { Context } from 'hono';
import type { Maybe } from 'shared';
import type { IBootstrappable } from '~/common';
import type { ServerType } from '@hono/node-server';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

@injectable()
export class RestService implements IBootstrappable {
	private hono?: Maybe<Hono>;
	private server?: Maybe<ServerType>;
	private apiToken = '';
	private rateLimitWindowStartedAt = 0;
	private requestsInWindow = 0;

	private readonly requestID = new IDGenerator('req#');

	public constructor(
		private readonly logger   = inject(LoggingService),
		private readonly ipc      = inject(IPCService),
		private readonly settings = inject(SettingsService),
		private readonly ytdlp    = inject(YtdlpService),
	) {}

	public async bootstrap() {
		const storedToken = this.settings.get<string>(ESettingsKey.LocalApiServerToken, '', { secure: true });
		this.apiToken     = storedToken || randomUUID();
		this.ipc.registerHandler('rest<-get-api-token', () => ok(this.apiToken));
		if (!storedToken) {
			await this.settings.set(ESettingsKey.LocalApiServerToken, this.apiToken, { secure: true });
		}

		if (!this.settings.get<boolean>(ESettingsKey.EnableLocalApiServer)) {
			return;
		}

		const port = Number(this.settings.get(ESettingsKey.LocalApiServerPort));
		if (!Number.isInteger(port) || port < 1 || port > 65535) {
			this.logger.error('Cannot start local API server due to invalid port setting', { port });
			return;
		}

		this.logger.info('Starting API server', { port });

		this.hono = new Hono();
		this.hono.use(async (c, next) => {
			const id              = this.requestID.nextID();
			const { url, method } = c.req;

			this.logger.trace('Received HTTP request', { id, method, url });

			await next();

			const { status } = c.res;

			c.res.headers.append('X-Request-ID', id);

			this.logger.trace('Sent HTTP response', { id, method, url, status });
		});
		this.hono.use(async (c, next) => {
			const host = c.req.header('host')?.toLowerCase();
			if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
				return this.createJSONResponse(c, 'Invalid Host header', {}, 400);
			}

			if (c.req.header('origin')) {
				return this.createJSONResponse(c, 'Browser-originated requests are not allowed', {}, 403);
			}

			const contentLength = Number(c.req.header('content-length') ?? 0);
			if (c.req.header('transfer-encoding') || !Number.isFinite(contentLength) || contentLength > 0) {
				return this.createJSONResponse(c, 'Request bodies are not accepted', {}, 413);
			}

			const now = Date.now();
			if (now - this.rateLimitWindowStartedAt >= 60_000) {
				this.rateLimitWindowStartedAt = now;
				this.requestsInWindow = 0;
			}
			if (++this.requestsInWindow > 60) {
				c.header('Retry-After', '60');
				return this.createJSONResponse(c, 'Too many requests', {}, 429);
			}

			const authorization = c.req.header('authorization');
			const token         = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
			if (!this.isValidToken(token)) {
				return this.createJSONResponse(c, 'Unauthorized', {}, 401);
			}

			return next();
		});
		this.hono.get('/ping', c => this.createJSONResponse(c, 'PONG'));
		this.hono.get('/is-busy', c => this.createJSONResponse(c, '', { busy: this.ytdlp.isBusy }));
		this.hono.post('/download', async c => {
			const inputURL = c.req.query('url');
			if (!inputURL) {
				return this.createJSONResponse(c, 'Missing `url` search parameter', {}, 400);
			}

			const url = inputURL.trim();
			if (url.length > 4_096 || !isValidURL(url)) {
				return this.createJSONResponse(c, 'Invalid `url` search parameter', {}, 400);
			}

			const format = c.req.query('format') ?? 'video';
			if (format !== 'audio' && format !== 'video') {
				return this.createJSONResponse(c, '`format` must be either `audio` or `video`', {}, 400);
			}
			if (this.ytdlp.isBusy) {
				return this.createJSONResponse(c, 'A download is currently in progress', {}, 423);
			}

			await this.ytdlp.enqueue(url, format === 'audio');

			return this.createJSONResponse(c, 'Download started', { url, format });
		});

		try {
			this.server = serve({ fetch: this.hono.fetch, port, hostname: '127.0.0.1' });
			this.server.on('error', error => this.logger.error('Local API server error', { error }));
		} catch (error) {
			this.logger.error('Failed to start local API server', { error });
			return;
		}

		eventBus.on('lifecycle:shutdown', () => this.server?.close());
	}

	private isValidToken(candidate: string) {
		const actual   = Buffer.from(candidate);
		const expected = Buffer.from(this.apiToken);

		return actual.length === expected.length && timingSafeEqual(actual, expected);
	}

	private createJSONResponse(c: Context, message: string = '', results: object = {}, status: number = 200) {
		return c.json({ message, results }, status as ContentfulStatusCode);
	}
}
