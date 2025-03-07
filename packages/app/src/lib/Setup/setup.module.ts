import { Setup } from './setup';
import { IpcChannel } from 'shared';
import { BinaryDownloader } from './binaryDownloader';
import type { Container } from '~/lib/Container';

export class SetupModule {
	public static async bootstrap(container: Container) {
		const binaryDownloader = new BinaryDownloader(
			container.get('Github'),
			container.get('HttpClientManager')
		);

		const ipc = container.get('Ipc');

		const setup = new Setup(
			ipc,
			container.get('Flags'),
			container.get('EventEmitter'),
			container.get('WindowManager'),
			container.get('SettingsManager'),
			binaryDownloader,
		);

		ipc.registerOnceHandler(IpcChannel.CancelSetup, () => setup.cancel());

		await setup.performSetup();
	}
}
