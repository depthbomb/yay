import { IpcChannel } from 'shared';
import { SettingsReader } from './settingsReader';
import { SettingsWriter } from './settingsWriter';
import { SettingsManager } from './settingsManager';
import { SettingsFileProvider } from './settingsFileProvider';
import type { Container } from '~/lib/Container';

export class SettingsManagerModule {
	public static bootstrap(container: Container) {
		const ipc                  = container.get('Ipc');
		const eventSubscriber      = container.get('EventSubscriber');
		const settingsFileProvider = new SettingsFileProvider();
		const settingsReader       = new SettingsReader(settingsFileProvider);
		const settingsWriter       = new SettingsWriter(settingsFileProvider);
		const settingsManager      = new SettingsManager(settingsReader, settingsWriter, container.get('EventEmitter'));

		container.register('SettingsManager', settingsManager);

		ipc.registerSyncHandler(
			IpcChannel.GetSettingsValue,
			(e, key, defaultValue, secure) => e.returnValue = settingsManager.get(key, defaultValue, { secure })
		);
		ipc.registerHandler(
			IpcChannel.GetSettingsValue,
			(_, key, defaultValue, secure) => settingsManager.get(key, defaultValue, { secure })
		);
		ipc.registerHandler(
			IpcChannel.SetSettingsValue,
			async (_, key, value, secure) => await settingsManager.set(key, value, { secure })
		);

		eventSubscriber.subscribe('settings-updated', ({ key, value }) => ipc.emitToAllWindows(IpcChannel.SettingsUpdated, key, value));
	}
}
