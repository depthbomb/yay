import { YtdlpManager } from './ytdlpManager';
import { IpcChannel, SettingsKey } from 'shared';
import type { Container } from '~/lib/Container';

export class YtdlpManagerModule {
	public static bootstrap(container: Container) {
		const ipc             = container.get('Ipc');
		const github          = container.get('Github');
		const eventEmitter    = container.get('EventEmitter');
		const settingsManager = container.get('SettingsManager');
		const ytdlpManager    = new YtdlpManager(ipc, github, eventEmitter, settingsManager);

		container.register('YtdlpManager', ytdlpManager);

		ipc.registerHandler(IpcChannel.DownloadVideo, async (_, url: string) => await ytdlpManager.download(url));
		ipc.registerHandler(IpcChannel.DownloadAudio, async (_, url: string) => await ytdlpManager.download(url, true));
		ipc.registerHandler(IpcChannel.DownloadDefault, async (_, url: string) => {
			const defaultAction = settingsManager.get(SettingsKey.DefaultDownloadAction);
			await ytdlpManager.download(url, defaultAction === 'audio');
		});
		ipc.registerHandler(IpcChannel.CancelDownload, () => ytdlpManager.cancelDownload());
		ipc.registerHandler(IpcChannel.CheckForYtdlpUpdate, async () => await ytdlpManager.hasUpdate());
		ipc.registerHandler(IpcChannel.UpdateYtdlpBinary, async () => await ytdlpManager.updateBinary());
	}
}
