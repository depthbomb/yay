import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { REST_SERVER_PORT } from '~/constants';
import { YtdlpService } from '~/services/ytdlp';
import { LoggingService } from '~/services/logging';
import { inject, injectable } from '@needle-di/core';
import { LifecycleService } from '~/services/lifecycle';
import { FeatureFlagsService } from '~/services/featureFlags';
import type { Maybe } from 'shared';
import type { IBootstrappable } from '~/common';
import type { ServerType } from '@hono/node-server';

@injectable()
export class RestService implements IBootstrappable {
	private hono?: Maybe<Hono>;
	private server?: Maybe<ServerType>;

	public constructor(
		private readonly logger    = inject(LoggingService),
		private readonly lifecycle = inject(LifecycleService),
		private readonly features  = inject(FeatureFlagsService),
		private readonly ytdlp     = inject(YtdlpService),
	) {}

	public async bootstrap() {
		if (!this.features.isEnabled('RESTServer')) {
			return;
		}

		this.logger.info('Starting REST server');

		this.hono = new Hono();
		this.hono.get('/ping', c => c.text('PONG'));
		this.hono.post('/download', c => {
			const url = c.req.query('url');
			if (!url) {
				return c.text('Missing `url` search parameter', 400);
			}

			const format = c.req.query('format') ?? 'video';
			if (this.ytdlp.isBusy) {
				return c.text('A download is currently in progress');
			}

			this.ytdlp.download(url, format === 'audio');

			return c.text('Download started');
		});

		this.server = serve({
			fetch: this.hono.fetch,
			port: REST_SERVER_PORT
		});

		this.lifecycle.events.on('shutdown', () => this.server?.close());
	}
}
