import { GlobalMenu } from './globalMenu';
import { globalShortcut } from 'electron';
import { IpcChannel, SettingsKey } from 'shared';
import type { Container } from '~/lib/Container';

export class GlobalMenuModule {
	public static bootstrap(container: Container) {
		const ipc             = container.get('Ipc');
		const eventSubscriber = container.get('EventSubscriber');
		const settingsManager = container.get('SettingsManager');
		const accelerator     = 'Super+Y' as const;
		const globalMenu      = new GlobalMenu(container.get('YtdlpManager'));
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

		ipc.registerHandler(IpcChannel.GetGlobalMenuEnabled, () => globalShortcut.isRegistered(accelerator));
		ipc.registerHandler(IpcChannel.EnableGlobalMenu, enableGlobalMenu);
		ipc.registerHandler(IpcChannel.DisableGlobalMenu, disableGlobalMenu);
		ipc.registerHandler(IpcChannel.ToggleGlobalMenu, toggleGlobalMenu);
	}
}
