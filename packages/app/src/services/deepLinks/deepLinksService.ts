import { app } from 'electron';
import { product } from 'shared';
import { YtdlpService } from '~/services/ytdlp';
import { LoggingService } from '~/services/logging';
import { UpdaterService } from '~/services/updater';
import { inject, injectable } from '@needle-di/core';
import type { IBootstrappable } from '~/common';

@injectable()
export class DeepLinksService implements IBootstrappable {
	public constructor(
		private readonly logger  = inject(LoggingService),
		private readonly updater = inject(UpdaterService),
		private readonly ytdlp   = inject(YtdlpService),
	) {}

	public async bootstrap() {
		if (!app.isDefaultProtocolClient(product.urlProtocol)) {
			this.logger.info('Setting app as default handler for protocol', { protocol: product.urlProtocol });
			app.setAsDefaultProtocolClient(product.urlProtocol);
		}

		app.on('second-instance', async (_, argv) => {
			this.logger.info('Handling second instance');

			await this.handleDeepLinks(argv);
		});
	}

	public async handleDeepLinks(args: string[] = []) {
		const deepLink = args.find(a => a.startsWith(`${product.urlProtocol}://`));
		if (!deepLink) {
			this.logger.info('No deeplink found');
			return;
		}

		const { host, searchParams } = new URL(deepLink);

		this.logger.info('Handling deeplink', { host, searchParams });

		if (searchParams.has('url')) {
			const mediaURL = searchParams.get('url')!;
			switch (host) {
				case 'download-video':
					await this.ytdlp.download(mediaURL, false);
					break;
				case 'download-audio':
					await this.ytdlp.download(mediaURL, true);
					break;
			}
		} else if (host === 'open-updater') {
			if (this.updater.hasNewRelease) {
				this.updater.showUpdaterWindow();
			}
		}
	}
}
