import { GlobalMenu } from './globalMenu';
import { globalShortcut } from 'electron';
import { IpcChannel, SettingsKey } from 'shared';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class GlobalMenuModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc             = moduleRegistry.get('Ipc');
		const eventSubscriber = moduleRegistry.get('EventSubscriber');
		const settingsManager = moduleRegistry.get('SettingsManager');
		const accelerator     = 'Super+Y' as const;
		const globalMenu      = new GlobalMenu(settingsManager, moduleRegistry.get('YtdlpManager'));
		const callback        = () => globalMenu.showMenu();

		const enableGlobalMenu = async () => {
			globalShortcut.register(accelerator, callback);
			await settingsManager.set(SettingsKey.EnableGlobalMenu, true);

			return true;
		};
		const disableGlobalMenu = async () => {
			globalShortcut.unregister(accelerator);
			await settingsManager.set(SettingsKey.EnableGlobalMenu, false);

			return false;
		};
		const toggleGlobalMenu = async () => {
			if (globalShortcut.isRegistered(accelerator)) {
				return disableGlobalMenu();
			} else {
				return enableGlobalMenu();
			}
		};

		if (settingsManager.get(SettingsKey.EnableGlobalMenu) === true) {
			eventSubscriber.subscribe('setup-finished', () => globalShortcut.register(accelerator, callback));
		}

		ipc.registerHandler(IpcChannel.GlobalMenu_IsEnabled, () => globalShortcut.isRegistered(accelerator));
		ipc.registerHandler(IpcChannel.GlobalMenu_Enable,    enableGlobalMenu);
		ipc.registerHandler(IpcChannel.GlobalMenu_Disable,   disableGlobalMenu);
		ipc.registerHandler(IpcChannel.GlobalMenu_Toggle,    toggleGlobalMenu);

		eventSubscriber.subscribe('download-started',  () => globalMenu.setMenu(true));
		eventSubscriber.subscribe('download-finished', () => globalMenu.setMenu(false));
	}
}
