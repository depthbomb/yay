import { YtdlpManager } from './ytdlpManager';
import { IpcChannel, SettingsKey } from 'shared';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class YtdlpManagerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc             = moduleRegistry.get('Ipc');
		const eventEmitter    = moduleRegistry.get('EventEmitter');
		const settingsManager = moduleRegistry.get('SettingsManager');
		const windowManager   = moduleRegistry.get('WindowManager');
		const ytdlpManager    = new YtdlpManager(eventEmitter, settingsManager, windowManager);

		moduleRegistry.register('YtdlpManager', ytdlpManager);

		ipc.registerHandler(IpcChannel.DownloadVideo, async (_, url: string) => await ytdlpManager.download(url));
		ipc.registerHandler(IpcChannel.DownloadAudio, async (_, url: string) => await ytdlpManager.download(url, true));
		ipc.registerHandler(IpcChannel.DownloadDefault, async (_, url: string) => {
			const defaultAction = settingsManager.get(SettingsKey.DefaultDownloadAction);
			await ytdlpManager.download(url, defaultAction === 'audio');
		});
		ipc.registerHandler(IpcChannel.CancelDownload, () => ytdlpManager.cancelDownload());
		ipc.registerHandler(IpcChannel.UpdateYtdlpBinary, async () => await ytdlpManager.updateBinary());
	}
}
