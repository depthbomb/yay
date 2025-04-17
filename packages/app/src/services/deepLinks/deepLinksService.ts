import { app } from 'electron';
import { product } from 'shared';
import { YtdlpService } from '~/services/ytdlp';
import { EventsService } from '~/services/events';
import { WindowService } from '~/services/window';
import { inject, injectable } from '@needle-di/core';
import type { IBootstrappable } from '~/common/IBootstrappable';

@injectable()
export class DeepLinksService implements IBootstrappable {
	public constructor(
		private readonly events = inject(EventsService),
		private readonly window = inject(WindowService),
		private readonly ytdlp  = inject(YtdlpService),
	) {}

	public async bootstrap(): Promise<any> {
		if (!app.isDefaultProtocolClient(product.urlProtocol)) {
			app.setAsDefaultProtocolClient(product.urlProtocol);
		}

		if (!app.requestSingleInstanceLock()) {
			app.exit();
		} else {
			app.on('second-instance', async (event, commandLine, workingDirectory) => {
				const deepLink = commandLine.find(a => a.startsWith(`${product.urlProtocol}://`));
				if (!deepLink) {
					this.window.getMainWindow()!.show();
					return;
				}

				const { host, searchParams } = new URL(deepLink);
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
					this.events.emit('show-updater');
				}
			});
		}
	}
}
