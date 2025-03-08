import { WindowPositioner } from './windowPositioner';
import type { ModuleRegistry } from '~/lib/ModuleRegistry';

export class WindowPositionerModule {
	public static bootstrap(moduleRegistry: ModuleRegistry) {
		moduleRegistry.register('WindowPositioner', new WindowPositioner());
	}
}
