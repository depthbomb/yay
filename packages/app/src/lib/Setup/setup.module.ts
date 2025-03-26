import { Setup } from './setup';
import { IpcChannel } from 'shared';
import { BinaryDownloader } from './binaryDownloader';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class SetupModule {
	public static async bootstrap(moduleRegistry: ModuleRegistry) {
		const binaryDownloader = new BinaryDownloader(
			moduleRegistry.get('Github'),
			moduleRegistry.get('HttpClientManager')
		);

		const ipc = moduleRegistry.get('Ipc');

		const setup = new Setup(
			moduleRegistry.get('Flags'),
			moduleRegistry.get('EventEmitter'),
			moduleRegistry.get('WindowManager'),
			moduleRegistry.get('SettingsManager'),
			binaryDownloader,
		);

		ipc.registerOnceHandler(IpcChannel.Setup_Cancel, () => setup.cancel());

		await setup.performSetup();
	}
}
