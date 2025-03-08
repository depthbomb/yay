import { Ipc } from './ipc';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class IpcModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		moduleRegistry.register('Ipc', new Ipc());
	}
}
