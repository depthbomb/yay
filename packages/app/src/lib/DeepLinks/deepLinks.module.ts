import { app } from 'electron';
import { product } from 'shared';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class DeepLinksModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const windowManager = moduleRegistry.get('WindowManager');
		const ytdlpManager  = moduleRegistry.get('YtdlpManager');

		if (!app.isDefaultProtocolClient(product.urlProtocol)) {
			app.setAsDefaultProtocolClient(product.urlProtocol);
		}

		if (!app.requestSingleInstanceLock()) {
			app.exit();
		} else {
			app.on('second-instance', async (event, commandLine, workingDirectory) => {
				const deepLink = commandLine.find(a => a.startsWith(`${product.urlProtocol}://`));
				if (!deepLink) {
					windowManager.getMainWindow()!.show();
					return;
				}

				const { host, searchParams } = new URL(deepLink);
				if (!searchParams.has('url')) {
					return;
				}

				const mediaUrl = searchParams.get('url')!;
				switch (host) {
					case 'download-video':
						await ytdlpManager.download(mediaUrl, false);
						break;
					case 'download-audio':
						await ytdlpManager.download(mediaUrl, true);
						break;
				}
			});
		}
	}
}
