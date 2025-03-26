import { app } from 'electron';
import { Updater } from './updater';
import { IpcChannel } from 'shared';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class UpdaterModule {
	public static async bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc               = moduleRegistry.get('Ipc');
		const httpClientManager = moduleRegistry.get('HttpClientManager');
		const windowManager     = moduleRegistry.get('WindowManager');
		const github            = moduleRegistry.get('Github');
		const updater           = new Updater(httpClientManager, windowManager, github);

		moduleRegistry.register('Updater', updater);

		const updateCheck = setInterval(async () => await updater.checkForUpdates(), 300_000);
		await updater.checkForUpdates();

		app.once('quit', () => clearInterval(updateCheck));

		ipc.registerHandler(IpcChannel.ShowUpdaterWindow, () => updater.showUpdaterWindow());
		ipc.registerHandler(IpcChannel.GetLatestRelease,  () => updater.latestRelease);
		ipc.registerHandler(IpcChannel.StartUpdate,       async () => await updater.startUpdate());
		ipc.registerHandler(IpcChannel.CancelUpdate,      () => updater.cancelUpdate());
	}
}
