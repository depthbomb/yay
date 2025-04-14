import { app } from 'electron';
import { Updater } from './updater';
import { IpcChannel } from 'shared';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class UpdaterModule {
	public static async bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc               = moduleRegistry.get('Ipc');
		const eventSubscriber   = moduleRegistry.get('EventSubscriber');
		const notifications     = moduleRegistry.get('Notifications');
		const httpClientManager = moduleRegistry.get('HttpClientManager');
		const windowManager     = moduleRegistry.get('WindowManager');
		const settingsManager   = moduleRegistry.get('SettingsManager');
		const github            = moduleRegistry.get('Github');
		const updater           = new Updater(notifications, httpClientManager, windowManager, settingsManager, github);

		moduleRegistry.register('Updater', updater);

		const updateCheck = setInterval(async () => await updater.checkForUpdates(), 180_000);
		await updater.checkForUpdates();

		app.once('quit', () => clearInterval(updateCheck));

		ipc.registerHandler(IpcChannel.Updater_ShowWindow,       () => updater.showUpdaterWindow());
		ipc.registerHandler(IpcChannel.Updater_GetLatestRelease, () => updater.latestRelease);
		ipc.registerHandler(IpcChannel.Updater_Update,           async () => await updater.startUpdate());
		ipc.registerHandler(IpcChannel.Updater_Cancel,           () => updater.cancelUpdate());

		eventSubscriber.subscribe('show-updater', () => updater.showUpdaterWindow());
	}
}
