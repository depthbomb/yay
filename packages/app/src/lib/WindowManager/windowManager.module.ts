import { IpcChannel } from 'shared';
import { WindowManager } from './windowManager';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class WindowManagerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc           = moduleRegistry.get('Ipc');
		const eventEmitter  = moduleRegistry.get('EventEmitter');
		const windowManager = new WindowManager(eventEmitter);

		moduleRegistry.register('WindowManager', windowManager);

		ipc.registerHandler(IpcChannel.Window_Minimize, (_, windowName: string) => windowManager.minimizeWindow(windowName));
	}
}
