import { Ipc } from './ipc';
import type { Container } from '~/lib/Container';

export class IpcModule {
	public static bootstrap(container: Container) {
		container.register('Ipc', new Ipc(container.get('WindowManager')));
	}
}
