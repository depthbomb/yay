import { Hono } from 'hono';
import { eventBus } from '~/events';
import { ESettingsKey } from 'shared';
import { IDGenerator } from '~/common';
import { serve } from '@hono/node-server';
import { YtdlpService } from '~/services/ytdlp';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { SettingsService } from '~/services/settings';
import type { Maybe } from 'shared';
import type { Context } from 'hono';
import type { IBootstrappable } from '~/common';
import type { ServerType } from '@hono/node-server';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

@injectable()
export class RestService implements IBootstrappable {
	private hono?: Maybe<Hono>;
	private server?: Maybe<ServerType>;

	private readonly requestID = new IDGenerator('req#');

	public constructor(
		private readonly logger   = inject(LoggingService),
		private readonly settings = inject(SettingsService),
		private readonly ytdlp    = inject(YtdlpService),
	) {}

	public async bootstrap() {
		if (!this.settings.get<boolean>(ESettingsKey.EnableLocalApiServer)) {
			return;
		}

		const port = this.settings.get<number>(ESettingsKey.LocalApiServerPort);

		this.logger.info('Starting API server');

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
		this.hono.get('/ping', c => this.createJSONResponse(c, 'PONG'));
		this.hono.get('/is-busy', c => this.createJSONResponse(c, '', { busy: this.ytdlp.isBusy }));
		this.hono.post('/download', c => {
			const url = c.req.query('url');
			if (!url) {
				return this.createJSONResponse(c, 'Missing `url` search parameter', {}, 400);
			}

			const format = c.req.query('format') ?? 'video';
			if (this.ytdlp.isBusy) {
				return this.createJSONResponse(c, 'A download is currently in progress', {}, 423);
			}

			this.ytdlp.download(url, format === 'audio');

			return this.createJSONResponse(c, 'Download started', { url, format });
		});

		this.server = serve({ fetch: this.hono.fetch, port });

		eventBus.on('lifecycle:shutdown', () => this.server?.close());
	}

	private createJSONResponse(c: Context, message: string = '', results: object = {}, status: number = 200) {
		return c.json({ message, results }, status as ContentfulStatusCode);
	}
}
