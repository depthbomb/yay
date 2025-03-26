import { YtdlpManager } from './ytdlpManager';
import { IpcChannel, SettingsKey } from 'shared';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';
import { ThumbnailDownloader } from './thumbnailDownloader';

export class YtdlpManagerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc                 = moduleRegistry.get('Ipc');
		const eventEmitter        = moduleRegistry.get('EventEmitter');
		const settingsManager     = moduleRegistry.get('SettingsManager');
		const windowManager       = moduleRegistry.get('WindowManager');
		const notifications       = moduleRegistry.get('Notifications');
		const thumbnailDownloader = new ThumbnailDownloader(moduleRegistry.get('HttpClientManager'));
		const ytdlpManager = new YtdlpManager(
			eventEmitter,
			settingsManager,
			windowManager,
			notifications,
			thumbnailDownloader
		);

		moduleRegistry.register('YtdlpManager', ytdlpManager);

		ipc.registerHandler(IpcChannel.Ytdlp_DownloadVideo, async (_, url: string) => await ytdlpManager.download(url));
		ipc.registerHandler(IpcChannel.Ytdlp_DownloadAudio, async (_, url: string) => await ytdlpManager.download(url, true));
		ipc.registerHandler(IpcChannel.Ytdlp_DownloadDefault, async (_, url: string) => {
			const defaultAction = settingsManager.get(SettingsKey.DefaultDownloadAction);
			await ytdlpManager.download(url, defaultAction === 'audio');
		});
		ipc.registerHandler(IpcChannel.Ytdlp_CancelDownload, () => ytdlpManager.cancelDownload());
		ipc.registerHandler(IpcChannel.Ytdlp_UpdateBinary, async () => await ytdlpManager.updateBinary());
	}
}
