import { IpcChannel } from 'shared';
import { WindowManager } from './windowManager';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class WindowManagerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		const ipc           = moduleRegistry.get('Ipc');
		const windowManager = new WindowManager();

		moduleRegistry.register('WindowManager', windowManager);

		ipc.registerHandler(IpcChannel.MinimizeWindow, (_, windowName: string) => windowManager.minimizeWindow(windowName));
	}
}
