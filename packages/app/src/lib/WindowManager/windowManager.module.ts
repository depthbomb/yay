import { WindowManager } from './windowManager';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class WindowManagerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		moduleRegistry.register('WindowManager', new WindowManager());
	}
}
