import { app } from 'electron';
import { AutoStart } from './autoStart';
import { IpcChannel, SettingsKey } from 'shared';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class AutoStartModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc             = moduleRegistry.get('Ipc');
		const flags           = moduleRegistry.get('Flags');
		const eventSubscriber = moduleRegistry.get('EventSubscriber');
		const autoStart       = new AutoStart();

		if (flags.uninstall) {
			autoStart.setAutoStart(false);
			app.exit(0);
		}

		moduleRegistry.register('AutoStart', autoStart);

		ipc.registerHandler(IpcChannel.Autostart_Enable,  () => autoStart.setAutoStart(true));
		ipc.registerHandler(IpcChannel.Autostart_Disable, () => autoStart.setAutoStart(false));
		ipc.registerHandler(IpcChannel.Autostart_Toggle,  () => autoStart.setAutoStart(!autoStart.isAutoStartEnabled()));

		eventSubscriber.subscribe('settings-updated', ({ key, value }) => {
			if (key === SettingsKey.AutoStart) {
				autoStart.setAutoStart(value as boolean);
			}
		});
	}
}
