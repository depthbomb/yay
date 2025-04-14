import { IpcChannel } from 'shared';
import { app, shell } from 'electron';
import { PRELOAD_PATH } from '~/constants';
import { SettingsReader } from './settingsReader';
import { SettingsWriter } from './settingsWriter';
import { SettingsManager } from './settingsManager';
import { SettingsFileProvider } from './settingsFileProvider';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class SettingsManagerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc                  = moduleRegistry.get('Ipc');
		const windowManager        = moduleRegistry.get('WindowManager');
		const eventSubscriber      = moduleRegistry.get('EventSubscriber');
		const settingsFileProvider = new SettingsFileProvider();
		const settingsReader       = new SettingsReader(settingsFileProvider);
		const settingsWriter       = new SettingsWriter(settingsFileProvider);
		const settingsManager      = new SettingsManager(settingsReader, settingsWriter, moduleRegistry.get('EventEmitter'));

		moduleRegistry.register('SettingsManager', settingsManager);

		ipc.registerSyncHandler(
			IpcChannel.Settings_Get,
			(e, key, defaultValue, secure) => e.returnValue = settingsManager.get(key, defaultValue, { secure })
		);
		ipc.registerHandler(
			IpcChannel.Settings_Get,
			(_, key, defaultValue, secure) => settingsManager.get(key, defaultValue, { secure })
		);
		ipc.registerHandler(
			IpcChannel.Settings_Set,
			async (_, key, value, secure) => await settingsManager.set(key, value, { secure })
		);
		ipc.registerHandler(
			IpcChannel.Settings_Reset,
			async () => {
				await settingsManager.reset();
				app.relaunch();
				app.exit(0);
			}
		);
		ipc.registerHandler(
			IpcChannel.Settings_ShowUi,
			() => {
				const mainWindow = windowManager.getMainWindow();
				const settingsWindow = windowManager.createWindow('settings', {
					url: windowManager.resolveRendererHTML('settings.html'),
					browserWindowOptions: {
						show: false,
						parent: mainWindow,
						minWidth: 600,
						width: 600,
						minHeight: 500,
						height: 500,
						roundedCorners: false,
						webPreferences: {
							spellcheck: false,
							enableWebSQL: false,
							nodeIntegration: true,
							devTools: import.meta.env.DEV,
							preload: PRELOAD_PATH,
						}
					},
					onReadyToShow() {
						if (import.meta.env.DEV) {
							settingsWindow.webContents.openDevTools({ mode: 'detach' });
						}

						settingsWindow.center();
						settingsWindow.show();
					}
				});

				settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
					const requestedUrl = new URL(url);
					if (requestedUrl.host === 'github.com') {
						/**
						 * Currently the only intended links to open in an external browser are for
						 * GitHub.
						 */
						shell.openExternal(url);
					}

					return { action: 'deny' };
				});
			}
		);

		eventSubscriber.subscribe('settings-updated', ({ key, value }) => windowManager.emitAll(IpcChannel.Settings_Changed, key, value));
	}
}
