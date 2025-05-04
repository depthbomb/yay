import { app } from 'electron';
import { product } from 'shared';
import { YtdlpService } from '~/services/ytdlp';
import { WindowService } from '~/services/window';
import { LoggingService } from '~/services/logging';
import { UpdaterService } from '~/services/updater';
import { inject, injectable } from '@needle-di/core';
import type { IBootstrappable } from '~/common/IBootstrappable';

@injectable()
export class DeepLinksService implements IBootstrappable {
	public constructor(
		private readonly logger  = inject(LoggingService),
		private readonly window  = inject(WindowService),
		private readonly updater = inject(UpdaterService),
		private readonly ytdlp   = inject(YtdlpService),
	) {}

	public async bootstrap(): Promise<any> {
		if (!app.isDefaultProtocolClient(product.urlProtocol)) {
			this.logger.info('Setting app as default handler for protocol', { protocol: product.urlProtocol });
			app.setAsDefaultProtocolClient(product.urlProtocol);
		}

		if (!app.requestSingleInstanceLock()) {
			this.logger.info('Single instance lock not acquired, exiting');
			app.exit();
		} else {
			app.on('second-instance', async (event, commandLine, workingDirectory) => {
				this.logger.info('Handling second instance');

				const deepLink = commandLine.find(a => a.startsWith(`${product.urlProtocol}://`));
				if (!deepLink) {
					this.logger.info('No deeplink found in second instance args, showing main window');
					this.window.getMainWindow()!.show();
					return;
				}

				const { host, searchParams } = new URL(deepLink);

				this.logger.info('Handling deeplink', { host, searchParams });

				if (searchParams.has('url')) {
					const mediaUrl = searchParams.get('url')!;
					switch (host) {
						case 'download-video':
							await this.ytdlp.download(mediaUrl, false);
							break;
						case 'download-audio':
							await this.ytdlp.download(mediaUrl, true);
							break;
					}
				} else if (host === 'open-updater') {
					if (this.updater.hasNewRelease) {
						this.updater.showUpdaterWindow();
					}
				}
			});
		}
	}
}
