import { app } from 'electron';
import { IpcChannel } from 'shared';
import { AutoStart } from './autoStart';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class AutoStartModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc       = moduleRegistry.get('Ipc');
		const flags     = moduleRegistry.get('Flags');
		const autoStart = new AutoStart();

		if (flags.uninstall) {
			autoStart.setAutoStart(false);
			app.exit(0);
		}

		moduleRegistry.register('AutoStart', autoStart);

		ipc.registerHandler(IpcChannel.GetAutoStart,     () => autoStart.isAutoStartEnabled());
		ipc.registerHandler(IpcChannel.EnableAutoStart,  () => autoStart.setAutoStart(true));
		ipc.registerHandler(IpcChannel.DisableAutoStart, () => autoStart.setAutoStart(false));
		ipc.registerHandler(IpcChannel.ToggleAutostart,  () => autoStart.setAutoStart(!autoStart.isAutoStartEnabled()));
	}
}
