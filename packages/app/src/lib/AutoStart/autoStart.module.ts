import { app } from 'electron';
import { IpcChannel } from 'shared';
import { AutoStart } from './autoStart';
import type { Container } from '~/lib/Container';

export class AutoStartModule {
	public static bootstrap(container: Container) {
		const ipc       = container.get('Ipc');
		const flags     = container.get('Flags');
		const autoStart = new AutoStart();

		if (flags.uninstall) {
			autoStart.setAutoStart(false);
			app.exit(0);
		}

		container.register('AutoStart', autoStart);

		ipc.registerHandler(IpcChannel.GetAutoStart,     () => autoStart.isAutoStartEnabled());
		ipc.registerHandler(IpcChannel.EnableAutoStart,  () => autoStart.setAutoStart(true));
		ipc.registerHandler(IpcChannel.DisableAutoStart, () => autoStart.setAutoStart(false));
		ipc.registerHandler(IpcChannel.ToggleAutostart,  () => autoStart.setAutoStart(!autoStart.isAutoStartEnabled()));
	}
}
